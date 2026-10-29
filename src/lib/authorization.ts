
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  hasPermission,
  type Permission,
} from "./permissions";

export type AuthorizationResult =
  | {
      authorized: true;
      userId: string;
      orgId: string;
      role: string;
    }
  | {
      authorized: false;
      status: number;
      error: string;
    };

export async function authorizeOrganisation(
  permission: Permission
): Promise<AuthorizationResult> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return {
      authorized: false,
      status: 401,
      error: "Authentication required",
    };
  }

  if (!orgId) {
    return {
      authorized: false,
      status: 400,
      error: "Select an organisation first",
    };
  }

  try {
    const client = await clerkClient();

    // Verify membership against Clerk on the server.
    const memberships =
      await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        userId: [userId],
      });

    const membership = memberships.data.find(
      (member) => member.publicUserData?.userId === userId
    );

    if (!membership) {
      return {
        authorized: false,
        status: 403,
        error: "You are not a member of this organisation",
      };
    }

    if (!hasPermission(membership.role, permission)) {
      return {
        authorized: false,
        status: 403,
        error: "You do not have permission for this action",
      };
    }

    return {
      authorized: true,
      userId,
      orgId,
      role: membership.role,
    };
  } catch (error) {
    console.error("Organisation authorization failed:", error);

    return {
      authorized: false,
      status: 500,
      error: "Unable to verify organisation permissions",
    };
  }
}
