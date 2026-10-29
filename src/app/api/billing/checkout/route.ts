
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { authorizeOrganisation } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  acquireCheckoutLock,
  releaseCheckoutLock,
} from "@/lib/checkout-lock";

export const runtime = "nodejs";

const blockingStatuses = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

export async function POST(request: Request) {
  const authorization = await authorizeOrganisation(
    "billing:manage"
  );

  if (!authorization.authorized) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const { plan } = body as { plan?: unknown };

  if (plan !== "PRO" && plan !== "ENTERPRISE") {
    return NextResponse.json(
      { error: "Select a valid subscription plan" },
      { status: 400 }
    );
  }

  const priceId =
    plan === "PRO"
      ? process.env.STRIPE_PRO_PRICE_ID
      : process.env.STRIPE_ENTERPRISE_PRICE_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price is not configured" },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();
    const client = await clerkClient();

    // Retrieve the active Clerk organisation.
    const clerkOrg =
      await client.organizations.getOrganization({
        organizationId: authorization.orgId,
      });

    // Ensure the organisation exists in our database.
    const organisation = await prisma.organisation.upsert({
      where: {
        clerkOrgId: authorization.orgId,
      },
      update: {
        name: clerkOrg.name,
      },
      create: {
        clerkOrgId: authorization.orgId,
        name: clerkOrg.name,
      },
    });

    // Acquire an atomic database checkout lock.
    const lockToken = await acquireCheckoutLock(
      organisation.id
    );

    if (!lockToken) {
      return NextResponse.json(
        {
          error:
            "A subscription checkout is already being prepared. Please try again shortly.",
          code: "CHECKOUT_IN_PROGRESS",
        },
        { status: 409 }
      );
    }

    try {
      // Re-read the organisation after acquiring the lock.
      const currentOrganisation =
        await prisma.organisation.findUniqueOrThrow({
          where: {
            id: organisation.id,
          },
        });

      let customerId =
        currentOrganisation.stripeCustomerId;

      // Create a Stripe customer only if one does not exist.
      if (!customerId) {
        const customer = await stripe.customers.create(
          {
            name: currentOrganisation.name,
            metadata: {
              organisationId: organisation.id,
              clerkOrgId: authorization.orgId,
            },
          },
          {
            idempotencyKey:
              `saasflow-customer-${organisation.id}`,
          }
        );

        customerId = customer.id;

        await prisma.organisation.update({
          where: {
            id: organisation.id,
          },
          data: {
            stripeCustomerId: customerId,
          },
        });
      }

      // Check for existing subscriptions directly in Stripe.
      const subscriptions =
        await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 100,
        });

      const existingSubscription =
        subscriptions.data.find((subscription) =>
          blockingStatuses.has(subscription.status)
        );

      if (existingSubscription) {
        return NextResponse.json(
          {
            error:
              "This organisation already has a subscription. Manage the existing subscription before creating another.",
            code: "SUBSCRIPTION_EXISTS",
          },
          { status: 409 }
        );
      }

      // Look for an existing open Checkout session.
      const sessions =
        await stripe.checkout.sessions.list({
          customer: customerId,
          limit: 100,
        });

      const openSession = sessions.data.find(
        (session) =>
          session.mode === "subscription" &&
          session.status === "open"
      );

      if (openSession) {
        const existingPlan =
          openSession.metadata?.plan;

        // Reuse an open session for the same plan.
        if (
          existingPlan === plan &&
          openSession.url
        ) {
          await prisma.organisation.update({
            where: {
              id: organisation.id,
            },
            data: {
              checkoutSessionId: openSession.id,
            },
          });

          return NextResponse.json({
            url: openSession.url,
            reused: true,
          });
        }

        return NextResponse.json(
          {
            error:
              "An unfinished checkout already exists for another plan. Complete or expire it before selecting a different plan.",
            code: "CHECKOUT_ALREADY_OPEN",
          },
          { status: 409 }
        );
      }

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        new URL(request.url).origin;

      // Create a Stripe Checkout session.
      // The idempotency key deduplicates retries of this attempt.
      const session =
        await stripe.checkout.sessions.create(
          {
            mode: "subscription",
            customer: customerId,
            line_items: [
              {
                price: priceId,
                quantity: 1,
              },
            ],
            success_url:
              `${appUrl}/dashboard/billing?checkout=success`,
            cancel_url:
              `${appUrl}/dashboard/billing?checkout=cancelled`,
            client_reference_id: organisation.id,
            metadata: {
              organisationId: organisation.id,
              clerkOrgId: authorization.orgId,
              plan,
            },
            subscription_data: {
              metadata: {
                organisationId: organisation.id,
                clerkOrgId: authorization.orgId,
                plan,
              },
            },
          },
          {
            idempotencyKey:
              `saasflow-checkout-${organisation.id}-${plan}-${lockToken}`,
          }
        );

      if (!session.url) {
        return NextResponse.json(
          {
            error:
              "Stripe checkout URL was not generated",
          },
          { status: 500 }
        );
      }

      // Save the Checkout session ID for tracking.
      await prisma.organisation.update({
        where: {
          id: organisation.id,
        },
        data: {
          checkoutSessionId: session.id,
        },
      });

      return NextResponse.json({
        url: session.url,
        reused: false,
      });
    } finally {
      // Release the lock, including when an error occurs.
      await releaseCheckoutLock(
        organisation.id,
        lockToken
      );
    }
  } catch (error) {
    console.error("Stripe checkout failed:", error);

    return NextResponse.json(
      {
        error:
          "Unable to start subscription checkout",
      },
      { status: 500 }
    );
  }
}
