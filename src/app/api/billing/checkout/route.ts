
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { authorizeOrganisation } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

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

  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
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

    const stripe = getStripe();
    const client = await clerkClient();

    const clerkOrg =
      await client.organizations.getOrganization({
        organizationId: authorization.orgId,
      });

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

    // Reuse the organisation's Stripe customer if available.
    let customerId = organisation.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: organisation.name,
        metadata: {
          organisationId: organisation.id,
          clerkOrgId: authorization.orgId,
        },
      });

      customerId = customer.id;

      await prisma.organisation.update({
        where: { id: organisation.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
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
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe checkout URL was not generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout failed:", error);

    return NextResponse.json(
      { error: "Unable to start subscription checkout" },
      { status: 500 }
    );
  }
}
