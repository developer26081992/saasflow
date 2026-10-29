
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Select an organisation first" },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Retrieve authenticated user details from Clerk.
    const clerkUser = await client.users.getUser(userId);

    // Retrieve the active organisation from Clerk.
    const clerkOrganisation =
      await client.organizations.getOrganization({
        organizationId: orgId,
      });

    // Confirm the user's membership and obtain their role.
    const membershipResponse =
      await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        userId: [userId],
      });

    const clerkMembership = membershipResponse.data.find(
      (membership) => membership.publicUserData?.userId === userId
    );

    if (!clerkMembership) {
      return NextResponse.json(
        { error: "You are not a member of this organisation" },
        { status: 403 }
      );
    }

    const role =
      clerkMembership.role === "org:admin"
        ? "ADMIN"
        : "MEMBER";

    const email =
      clerkUser.emailAddresses.find(
        (address) =>
          address.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json(
        { error: "User has no email address" },
        { status: 400 }
      );
    }

    // Synchronise all three records in one transaction.
    const result = await prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.upsert({
        where: {
          clerkOrgId: orgId,
        },
        update: {
          name: clerkOrganisation.name,
        },
        create: {
          clerkOrgId: orgId,
          name: clerkOrganisation.name,
        },
      });

      const user = await tx.user.upsert({
        where: {
          clerkUserId: userId,
        },
        update: {
          email,
          name: clerkUser.fullName,
        },
        create: {
          clerkUserId: userId,
          email,
          name: clerkUser.fullName,
        },
      });

      const membership = await tx.membership.upsert({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId: organisation.id,
          },
        },
        update: {
          role,
        },
        create: {
          userId: user.id,
          orgId: organisation.id,
          role,
        },
      });

      return {
        organisation: {
          id: organisation.id,
          name: organisation.name,
        },
        user: {
          id: user.id,
          email: user.email,
        },
        membership: {
          id: membership.id,
          role: membership.role,
        },
      };
    });

    return NextResponse.json({
      message: "Membership synchronised successfully",
      ...result,
    });
  } catch (error) {
    console.error("Membership sync failed:", error);

    return NextResponse.json(
      { error: "Failed to synchronise membership" },
      { status: 500 }
    );
  }
}
