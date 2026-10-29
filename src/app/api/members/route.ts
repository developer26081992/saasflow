
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { authorizeOrganisation } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeOrganisation(
    "members:view"
  );

  if (!authorization.authorized) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  try {
    const client = await clerkClient();

    const response =
      await client.organizations.getOrganizationMembershipList({
        organizationId: authorization.orgId,
        limit: 100,
      });

    const members = response.data.map((member) => ({
      id: member.id,
      userId: member.publicUserData?.userId ?? "",
      name:
        [
          member.publicUserData?.firstName,
          member.publicUserData?.lastName,
        ]
          .filter(Boolean)
          .join(" ") || "Unnamed Member",
      email: member.publicUserData?.identifier ?? "",
      role: member.role,
      joinedAt: member.createdAt,
    }));

    return NextResponse.json({
      members,
      totalCount: response.totalCount,
    });
  } catch (error) {
    console.error("GET /api/members failed:", error);

    return NextResponse.json(
      { error: "Failed to load members" },
      { status: 500 }
    );
  }
}
