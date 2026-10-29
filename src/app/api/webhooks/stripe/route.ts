
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaidPlan = "PRO" | "ENTERPRISE";

function getPlanFromPrice(
  priceId: string | undefined
): PaidPlan | null {
  if (
    priceId &&
    priceId === process.env.STRIPE_PRO_PRICE_ID
  ) {
    return "PRO";
  }

  if (
    priceId &&
    priceId ===
      process.env.STRIPE_ENTERPRISE_PRICE_ID
  ) {
    return "ENTERPRISE";
  }

  return null;
}

async function syncSubscription(
  subscription: Stripe.Subscription
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const organisation =
    await prisma.organisation.findUnique({
      where: {
        stripeCustomerId: customerId,
      },
    });

  if (!organisation) {
    throw new Error(
      "No organisation found for Stripe customer"
    );
  }

  const priceId =
    subscription.items.data[0]?.price.id;

  const paidPlan = getPlanFromPrice(priceId);

  const activeStatuses = [
    "active",
    "trialing",
  ];

  const isActive =
    activeStatuses.includes(subscription.status);

  // Only recognised prices with active subscriptions
  // receive paid features.
  const plan =
    isActive && paidPlan ? paidPlan : "FREE";

  await prisma.organisation.update({
    where: {
      id: organisation.id,
    },
    data: {
      plan,
      stripeSubscriptionId: subscription.id,
    },
  });
}

export async function POST(request: Request) {
  const signature =
    request.headers.get("stripe-signature");

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook configuration missing" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();

    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error
    );

    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscription(
          event.data.object as Stripe.Subscription
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as Stripe.Subscription;

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        await prisma.organisation.updateMany({
          where: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
          },
          data: {
            plan: "FREE",
            stripeSubscriptionId: null,
          },
        });

        break;
      }

      default:
        // Other event types are not required yet.
        break;
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error
    );

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
