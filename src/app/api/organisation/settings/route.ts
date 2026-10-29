
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { authorizeOrganisation } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Retrieve the current organisation's settings.
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

    const organisation =
      await client.organizations.getOrganization({
        organizationId: authorization.orgId,
      });

    return NextResponse.json({
      organisation: {
        id: organisation.id,
        name: organisation.name,
        slug: organisation.slug,
        createdAt: organisation.createdAt,
      },
    });
  } catch (error) {
    console.error("GET organisation settings failed:", error);

    return NextResponse.json(
      { error: "Failed to load organisation settings" },
      { status: 500 }
    );
  }
}

// PATCH: Allow administrators to update the organisation name.
export async function PATCH(request: Request) {
  const authorization = await authorizeOrganisation(
    "settings:manage"
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
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid organisation data" },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const name =
      typeof data.name === "string"
        ? data.name.trim()
        : "";

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Organisation name must be 2–100 characters" },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    const updated =
      await client.organizations.updateOrganization(
        authorization.orgId,
        { name }
      );

    // Keep the local database synchronised with Clerk.
    await prisma.organisation.upsert({
      where: {
        clerkOrgId: authorization.orgId,
      },
      update: {
        name: updated.name,
      },
      create: {
        clerkOrgId: authorization.orgId,
        name: updated.name,
      },
    });

    return NextResponse.json({
      message: "Organisation settings updated",
      organisation: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
      },
    });
  } catch (error) {
    console.error("PATCH organisation settings failed:", error);

    return NextResponse.json(
      { error: "Failed to update organisation settings" },
      { status: 500 }
    );
  }
}
