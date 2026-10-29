
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeOrganisation } from "@/lib/authorization";
import {
  canCreateProject,
  PLANS,
  type SubscriptionPlan,
} from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

// GET: Load projects for the active organisation.
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

// POST: Create a project with subscription limits.
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

  let body: unknown;

  try {
    body = await req.json();
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

  try {
    const organisation = await getOrganisation(
      authorization.orgId
    );

    // Lock this organisation's row during the
    // count-and-create operation. Requests for the
    // same organisation are processed sequentially.
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT id
          FROM "Organisation"
          WHERE id = ${organisation.id}
          FOR UPDATE
        `;

        const currentOrganisation =
          await tx.organisation.findUniqueOrThrow({
            where: {
              id: organisation.id,
            },
            select: {
              plan: true,
            },
          });

        const plan =
          currentOrganisation.plan as SubscriptionPlan;

        const projectCount = await tx.project.count({
          where: {
            orgId: organisation.id,
          },
        });

        if (!canCreateProject(plan, projectCount)) {
          return {
            allowed: false as const,
            plan,
            projectCount,
          };
        }

        const project = await tx.project.create({
          data: {
            name,
            description: description || null,
            orgId: organisation.id,
          },
        });

        return {
          allowed: true as const,
          project,
          plan,
          projectCount: projectCount + 1,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      }
    );

    if (!result.allowed) {
      const limit =
        PLANS[result.plan].maxProjects;

      return NextResponse.json(
        {
          error:
            `Your ${PLANS[result.plan].name} plan ` +
            `allows a maximum of ${limit} projects. ` +
            "Upgrade your plan to create more projects.",
          code: "PROJECT_LIMIT_REACHED",
          plan: result.plan,
          currentProjects: result.projectCount,
          maxProjects: limit,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { project: result.project },
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
