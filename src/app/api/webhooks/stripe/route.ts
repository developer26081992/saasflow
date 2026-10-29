
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
    priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID
  ) {
    return "ENTERPRISE";
  }

  return null;
}

function getCustomerId(
  subscription: Stripe.Subscription
): string {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

async function syncCustomerSubscriptions(
  customerId: string
) {
  const stripe = getStripe();

  const organisation =
    await prisma.organisation.findUnique({
      where: {
        stripeCustomerId: customerId,
      },
    });

  if (!organisation) {
    // Generic test events may reference customers
    // that do not belong to a SaaSFlow organisation.
    console.warn(
      "Stripe webhook: unknown customer",
      customerId
    );
    return;
  }

  // Fetch the current state from Stripe instead
  // of applying possibly outdated webhook data.
  const subscriptions =
    await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

  const eligibleSubscriptions =
    subscriptions.data.filter(
      (subscription) =>
        subscription.status === "active" ||
        subscription.status === "trialing"
    );

  const paidSubscription =
    eligibleSubscriptions.find((subscription) =>
      subscription.items.data.some(
        (item) =>
          getPlanFromPrice(item.price.id) !== null
      )
    );

  if (paidSubscription) {
    const priceId =
      paidSubscription.items.data.find(
        (item) =>
          getPlanFromPrice(item.price.id) !== null
      )?.price.id;

    const plan = getPlanFromPrice(priceId);

    if (!plan) {
      return;
    }

    await prisma.organisation.update({
      where: {
        id: organisation.id,
      },
      data: {
        plan,
        stripeSubscriptionId: paidSubscription.id,
      },
    });

    return;
  }

  // No active or trialing recognised subscription:
  // return the organisation to its Free plan.
  await prisma.organisation.update({
    where: {
      id: organisation.id,
    },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
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
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as Stripe.Subscription;

        const customerId =
          getCustomerId(subscription);

        await syncCustomerSubscriptions(customerId);

        break;
      }

      default:
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
