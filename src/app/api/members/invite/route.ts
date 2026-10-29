
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { authorizeOrganisation } from "@/lib/authorization";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Verify that the current user can invite members.
  const authorization = await authorizeOrganisation(
    "members:invite"
  );

  if (!authorization.authorized) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
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

    const client = await clerkClient();

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
      errors?: Array<{
        code?: string;
        message?: string;
      }>;
    };

    // Return a safe, specific response for common failures.
    if (clerkError.status === 422) {
      return NextResponse.json(
        {
          error:
            "Invitation could not be created. Check whether the email is already a member or has a pending invitation.",
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
