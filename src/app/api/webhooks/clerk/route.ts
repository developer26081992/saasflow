
import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  // 1. Check webhook signing secret
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is missing");

    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // 2. Read Svix headers
  const headerPayload = headers();

  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("Missing required Svix headers");

    return NextResponse.json(
      { error: "Missing webhook headers" },
      { status: 400 }
    );
  }

  // 3. Read original request body
  const payload = await req.text();

  let event: WebhookEvent;

  // 4. Verify Clerk webhook signature
  try {
    const verifiedPayload: unknown = new Webhook(secret).verify(
      payload,
      {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }
    );

    if (
      typeof verifiedPayload !== "object" ||
      verifiedPayload === null ||
      !("type" in verifiedPayload) ||
      !("data" in verifiedPayload)
    ) {
      throw new Error("Invalid webhook event payload");
    }

    event = verifiedPayload as WebhookEvent;
  } catch (error) {
    // Safe diagnostics: never log secret values
    console.error("Webhook verification failed:", {
      message:
        error instanceof Error
          ? error.message
          : String(error),
      secretConfigured: Boolean(secret),
      secretHasExpectedPrefix: secret.startsWith("whsec_"),
      secretHasWhitespace: secret !== secret.trim(),
      headersPresent: Boolean(
        svixId && svixTimestamp && svixSignature
      ),
    });

    return NextResponse.json(
      { error: "Invalid webhook signature or payload" },
      { status: 400 }
    );
  }

  // 5. Process verified Clerk events
  try {
    switch (event.type) {
      // Organisation created or updated
      case "organization.created":
      case "organization.updated": {
        const org = event.data;

        await prisma.organisation.upsert({
          where: {
            clerkOrgId: org.id,
          },
          create: {
            clerkOrgId: org.id,
            name: org.name,
          },
          update: {
            name: org.name,
          },
        });

        break;
      }

      // User created or updated
      case "user.created":
      case "user.updated": {
        const user = event.data;

        const primaryEmail = user.email_addresses.find(
          (email) =>
            email.id === user.primary_email_address_id
        );

        const email =
          primaryEmail?.email_address ??
          user.email_addresses[0]?.email_address;

        if (!email) {
          console.warn(
            "User event received without an email address"
          );
          break;
        }

        const name = [
          user.first_name,
          user.last_name,
        ]
          .filter(Boolean)
          .join(" ");

        await prisma.user.upsert({
          where: {
            clerkUserId: user.id,
          },
          create: {
            clerkUserId: user.id,
            email,
            name: name || null,
          },
          update: {
            email,
            name: name || null,
          },
        });

        break;
      }

      // Organisation membership created or updated
      case "organizationMembership.created":
      case "organizationMembership.updated": {
        const membership = event.data;

        const clerkUserId =
          membership.public_user_data.user_id;

        const clerkOrgId =
          membership.organization.id;

        const role =
          membership.role === "org:admin"
            ? "ADMIN"
            : "MEMBER";

        const user = await prisma.user.findUnique({
          where: {
            clerkUserId,
          },
        });

        const organisation =
          await prisma.organisation.findUnique({
            where: {
              clerkOrgId,
            },
          });

        if (!user || !organisation) {
          console.warn(
            "Membership dependencies not yet synchronised",
            {
              clerkUserId,
              clerkOrgId,
            }
          );

          break;
        }

        await prisma.membership.upsert({
          where: {
            userId_orgId: {
              userId: user.id,
              orgId: organisation.id,
            },
          },
          create: {
            userId: user.id,
            orgId: organisation.id,
            role,
          },
          update: {
            role,
          },
        });

        break;
      }

      // Organisation membership deleted
      case "organizationMembership.deleted": {
        const membership = event.data;

        const user = await prisma.user.findUnique({
          where: {
            clerkUserId:
              membership.public_user_data.user_id,
          },
        });

        const organisation =
          await prisma.organisation.findUnique({
            where: {
              clerkOrgId:
                membership.organization.id,
            },
          });

        if (user && organisation) {
          await prisma.membership.deleteMany({
            where: {
              userId: user.id,
              orgId: organisation.id,
            },
          });
        }

        break;
      }

      // Organisation deleted
      case "organization.deleted": {
        if (event.data.id) {
          await prisma.organisation.deleteMany({
            where: {
              clerkOrgId: event.data.id,
            },
          });
        }

        break;
      }

      // User deleted
      case "user.deleted": {
        if (event.data.id) {
          await prisma.user.deleteMany({
            where: {
              clerkUserId: event.data.id,
            },
          });
        }

        break;
      }

      default: {
        console.log(
          "Unhandled Clerk webhook event:",
          event.type
        );
        break;
      }
    }

    console.log("Clerk webhook processed:", event.type);

    return NextResponse.json({
      success: true,
      eventType: event.type,
    });
  } catch (error) {
    console.error(
      "Clerk webhook processing failed:",
      error
    );

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
