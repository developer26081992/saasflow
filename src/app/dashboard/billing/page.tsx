
"use client";

import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
  FolderKanban,
} from "lucide-react";
import {
  PLANS,
  type SubscriptionPlan,
} from "@/lib/plans";

const planOrder: SubscriptionPlan[] = [
  "FREE",
  "PRO",
  "ENTERPRISE",
];

export default function BillingPage() {
  const { organization, membership, isLoaded } =
    useOrganization();

  const isAdmin = membership?.role === "org:admin";

  // Temporary display value.
  // Later this will come from the organisation's
  // verified subscription record in Prisma.
  const currentPlan: SubscriptionPlan = "FREE";

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-600">
            <CreditCard className="h-4 w-4" />
            Subscription Management
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Billing & Plans
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            Explore SaaSFlow subscription plans and
            choose the features your organisation needs.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  Displayed Plan
                </p>
                <p className="text-xl font-bold">
                  {PLANS[currentPlan].name}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Placeholder only — live subscription status
              will appear after webhook integration.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  Free Plan Project Limit
                </p>
                <p className="text-xl font-bold">
                  {PLANS.FREE.maxProjects} Projects
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Project usage tracking will be added next.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  Free Plan Member Limit
                </p>
                <p className="text-xl font-bold">
                  {PLANS.FREE.maxMembers} Members
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Member usage tracking will be added next.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold">
            Choose Your Plan
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Example monthly pricing for the SaaSFlow
            practical project.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {planOrder.map((planKey) => {
            const plan = PLANS[planKey];
            const featured = planKey === "PRO";

            return (
              <div
                key={planKey}
                className={`relative flex flex-col rounded-2xl border bg-white p-7 shadow-sm ${
                  featured
                    ? "border-indigo-400 ring-2 ring-indigo-100"
                    : "border-slate-200"
                }`}
              >
                {featured && (
                  <div className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Popular Plan
                  </div>
                )}

                <h3 className="text-xl font-bold">
                  {plan.name}
                </h3>

                <p className="mt-2 min-h-10 text-sm text-slate-500">
                  {plan.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-slate-500">
                    /month
                  </span>
                </div>

                <div className="my-6 border-t border-slate-100" />

                <div className="flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-3 text-sm text-slate-700"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled
                  title="Checkout will be enabled after webhook integration."
                  className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-500"
                >
                  <LockKeyhole className="h-4 w-4" />
                  {planKey === "FREE"
                    ? "Free Plan"
                    : "Coming Soon"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-indigo-600" />

            <div>
              <h3 className="font-semibold text-slate-900">
                Secure Subscription Management
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Stripe checkout is being configured in
                test mode. Subscription upgrades will
                become available after verified webhooks
                and billing safeguards are implemented.
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Organisation:{" "}
                <strong>
                  {isLoaded
                    ? organization?.name || "Not selected"
                    : "Loading..."}
                </strong>
                {" · "}
                Access:{" "}
                <strong>
                  {isLoaded
                    ? isAdmin
                      ? "Administrator"
                      : "Member"
                    : "Loading..."}
                </strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
