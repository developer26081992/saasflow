
export type SubscriptionPlan =
  | "FREE"
  | "PRO"
  | "ENTERPRISE";

export type PlanDetails = {
  name: string;
  description: string;
  price: number;
  currency: string;
  maxProjects: number | null;
  maxMembers: number | null;
  prioritySupport: boolean;
  features: string[];
};

export const PLANS: Record<
  SubscriptionPlan,
  PlanDetails
> = {
  FREE: {
    name: "Free",
    description: "For individuals getting started.",
    price: 0,
    currency: "USD",
    maxProjects: 3,
    maxMembers: 2,
    prioritySupport: false,
    features: [
      "Up to 3 projects",
      "Up to 2 team members",
      "Organisation dashboard",
      "Basic project management",
    ],
  },

  PRO: {
    name: "Pro",
    description: "For growing teams.",
    price: 15,
    currency: "USD",
    maxProjects: 25,
    maxMembers: 10,
    prioritySupport: true,
    features: [
      "Up to 25 projects",
      "Up to 10 team members",
      "Advanced team management",
      "Priority support",
    ],
  },

  ENTERPRISE: {
    name: "Enterprise",
    description: "For larger organisations.",
    price: 49,
    currency: "USD",
    maxProjects: null,
    maxMembers: null,
    prioritySupport: true,
    features: [
      "Unlimited projects",
      "Unlimited team members",
      "Advanced organisation management",
      "Priority support",
    ],
  },
};

export function canCreateProject(
  plan: SubscriptionPlan,
  currentProjectCount: number
): boolean {
  const limit = PLANS[plan].maxProjects;

  return (
    limit === null ||
    currentProjectCount < limit
  );
}

export function canAddMember(
  plan: SubscriptionPlan,
  currentMemberCount: number
): boolean {
  const limit = PLANS[plan].maxMembers;

  return (
    limit === null ||
    currentMemberCount < limit
  );
}
