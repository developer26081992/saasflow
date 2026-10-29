
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeOrganisation } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Find or synchronise an authorised organisation.
async function getOrganisation(orgId: string) {
  const client = await clerkClient();

  const clerkOrganisation =
    await client.organizations.getOrganization({
      organizationId: orgId,
    });

  return prisma.organisation.upsert({
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
}

// GET: Load projects belonging to the active organisation.
export async function GET() {
  const authorization = await authorizeOrganisation(
    "projects:view"
  );

  if (!authorization.authorized) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  try {
    const organisation = await getOrganisation(
      authorization.orgId
    );

    const projects = await prisma.project.findMany({
      where: {
        orgId: organisation.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("GET /api/projects failed:", error);

    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}

// POST: Create a project for the active organisation.
export async function POST(req: Request) {
  const authorization = await authorizeOrganisation(
    "projects:create"
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
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid project data" },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const name =
      typeof data.name === "string"
        ? data.name.trim()
        : "";

    const description =
      typeof data.description === "string"
        ? data.description.trim()
        : "";

    if (
      !name ||
      name.length > 100 ||
      description.length > 500
    ) {
      return NextResponse.json(
        {
          error: "Invalid project name or description",
        },
        { status: 400 }
      );
    }

    const organisation = await getOrganisation(
      authorization.orgId
    );

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        orgId: organisation.id,
      },
    });

    return NextResponse.json(
      { project },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/projects failed:", error);

    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
