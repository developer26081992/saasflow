
import { NextResponse } from "next/server";
import { authorizeOrganisation } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { PLANS, type SubscriptionPlan } from "@/lib/plans";

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
    const organisation =
      await prisma.organisation.findUnique({
        where: {
          clerkOrgId: authorization.orgId,
        },
        select: {
          id: true,
          name: true,
          plan: true,
          stripeSubscriptionId: true,
          _count: {
            select: {
              projects: true,
              memberships: true,
            },
          },
        },
      });

    if (!organisation) {
      return NextResponse.json({
        plan: "FREE",
        subscriptionActive: false,
        projectsUsed: 0,
        membersSynced: 0,
        limits: {
          maxProjects: PLANS.FREE.maxProjects,
          maxMembers: PLANS.FREE.maxMembers,
        },
      });
    }

    const plan =
      organisation.plan as SubscriptionPlan;

    return NextResponse.json({
      plan,
      subscriptionActive:
        plan !== "FREE" &&
        Boolean(organisation.stripeSubscriptionId),
      projectsUsed: organisation._count.projects,
      membersSynced: organisation._count.memberships,
      limits: {
        maxProjects: PLANS[plan].maxProjects,
        maxMembers: PLANS[plan].maxMembers,
      },
    });
  } catch (error) {
    console.error("Billing status error:", error);

    return NextResponse.json(
      { error: "Unable to load billing status" },
      { status: 500 }
    );
  }
}
