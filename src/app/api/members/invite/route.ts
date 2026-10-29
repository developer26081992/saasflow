
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { authorizeOrganisation } from "@/lib/authorization";
import {
  PLANS,
  canAddMember,
  type SubscriptionPlan,
} from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = await authorizeOrganisation(
    "members:invite"
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
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid invitation details" },
      { status: 400 }
    );
  }

  const data = body as Record<string, unknown>;

  const emailAddress =
    typeof data.email === "string"
      ? data.email.trim().toLowerCase()
      : "";

  if (
    emailAddress.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)
  ) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 }
    );
  }

  try {
    const client = await clerkClient();

    const organisation =
      await prisma.organisation.findUnique({
        where: {
          clerkOrgId: authorization.orgId,
        },
        select: {
          plan: true,
        },
      });

    const plan: SubscriptionPlan =
      organisation?.plan ?? "FREE";

    // Retrieve the total number of active members.
    const memberships =
      await client.organizations.getOrganizationMembershipList({
        organizationId: authorization.orgId,
        limit: 1,
      });

    const memberCount =
      memberships.totalCount;

    // Retrieve pending invitations.
    const invitations =
      await client.organizations.getOrganizationInvitationList({
        organizationId: authorization.orgId,
        status: ["pending"],
        limit: 1,
      });

    const pendingCount =
      invitations.totalCount;

    const reservedPlaces =
      memberCount + pendingCount;

    if (!canAddMember(plan, reservedPlaces)) {
      const limit = PLANS[plan].maxMembers;

      return NextResponse.json(
        {
          error:
            `Your ${PLANS[plan].name} plan allows ` +
            `a maximum of ${limit} members, ` +
            "including pending invitations.",
          code: "MEMBER_LIMIT_REACHED",
          plan,
          currentMembers: memberCount,
          pendingInvitations: pendingCount,
          maxMembers: limit,
        },
        { status: 403 }
      );
    }

    const invitation =
      await client.organizations.createOrganizationInvitation({
        organizationId: authorization.orgId,
        emailAddress,
        role: "org:member",
        inviterUserId: authorization.userId,
      });

    return NextResponse.json(
      {
        message: "Invitation sent successfully",
        invitationId: invitation.id,
        status: invitation.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Member invitation failed:", error);

    const clerkError = error as {
      status?: number;
    };

    if (clerkError.status === 422) {
      return NextResponse.json(
        {
          error:
            "Invitation could not be created. The email may already belong to a member or have a pending invitation.",
        },
        { status: 422 }
      );
    }

    if (clerkError.status === 403) {
      return NextResponse.json(
        { error: "Invitation is not permitted" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
