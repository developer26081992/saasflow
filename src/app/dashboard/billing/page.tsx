
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  FolderKanban,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  PLANS,
  type SubscriptionPlan,
} from "@/lib/plans";

type BillingStatus = {
  plan: SubscriptionPlan;
  subscriptionActive: boolean;
  projectsUsed: number;
  membersSynced: number;
  limits: {
    maxProjects: number | null;
    maxMembers: number | null;
  };
};

const planOrder: SubscriptionPlan[] = [
  "FREE",
  "PRO",
  "ENTERPRISE",
];

export default function BillingPage() {
  const { organization, membership, isLoaded } =
    useOrganization();

  const [status, setStatus] =
    useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = membership?.role === "org:admin";

  const loadStatus = useCallback(
    async (signal?: AbortSignal) => {
      if (!organization) {
        setStatus(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/billing/status",
          {
            cache: "no-store",
            signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load billing status"
          );
        }

        if (!signal?.aborted) {
          setStatus(data);
        }
      } catch (err) {
        if (!signal?.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load billing status"
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [organization]
  );

  useEffect(() => {
    if (!isLoaded) return;

    const controller = new AbortController();

    setStatus(null);
    loadStatus(controller.signal);

    return () => controller.abort();
  }, [isLoaded, loadStatus]);

  const currentPlan = status?.plan;
  const currentDetails = currentPlan
    ? PLANS[currentPlan]
    : null;

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
            Billing &amp; Plans
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            View your organisation&apos;s current plan,
            usage and available subscription options.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => loadStatus()}
            disabled={loading || !organization}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading billing information...
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <Crown className="h-7 w-7 text-indigo-600" />
              <p className="mt-4 text-sm text-slate-500">
                Current Plan
              </p>
              <p className="mt-2 text-2xl font-bold">
                {currentDetails?.name ?? "Unavailable"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {status?.subscriptionActive
                  ? "Active paid subscription"
                  : currentPlan === "FREE"
                  ? "Free organisation plan"
                  : "Subscription status unavailable"}
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <FolderKanban className="h-7 w-7 text-blue-600" />
              <p className="mt-4 text-sm text-slate-500">
                Projects Used
              </p>
              <p className="mt-2 text-2xl font-bold">
                {status
                  ? `${status.projectsUsed} / ${
                      status.limits.maxProjects ?? "Unlimited"
                    }`
                  : "Unavailable"}
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <Users className="h-7 w-7 text-emerald-600" />
              <p className="mt-4 text-sm text-slate-500">
                Synced Members
              </p>
              <p className="mt-2 text-2xl font-bold">
                {status
                  ? `${status.membersSynced} / ${
                      status.limits.maxMembers ?? "Unlimited"
                    }`
                  : "Unavailable"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Members recorded in Prisma. Clerk
                membership totals may differ until synced.
              </p>
            </div>
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-2xl font-bold">
            Available Plans
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Monthly test pricing for the SaaSFlow
            practical project.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {planOrder.map((planKey) => {
            const plan = PLANS[planKey];
            const featured = planKey === "PRO";
            const selected =
              currentPlan === planKey;

            return (
              <div
                key={planKey}
                className={`flex flex-col rounded-2xl border bg-white p-7 shadow-sm ${
                  selected
                    ? "border-indigo-500 ring-2 ring-indigo-100"
                    : featured
                    ? "border-indigo-300"
                    : "border-slate-200"
                }`}
              >
                {featured && (
                  <div className="mb-4 inline-flex w-fit items-center gap-1 text-xs font-semibold text-indigo-700">
                    <Sparkles className="h-4 w-4" />
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

                <div className="my-6 border-t" />

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
                  title="Checkout is disabled until subscription safeguards are verified."
                  className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-500"
                >
                  {selected ? (
                    <>
                      <Crown className="h-4 w-4" />
                      Current Plan
                    </>
                  ) : (
                    <>
                      <LockKeyhole className="h-4 w-4" />
                      {planKey === "FREE"
                        ? "Free Plan"
                        : "Checkout Pending"}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-indigo-600" />

            <div>
              <h3 className="font-semibold">
                Secure Subscription Management
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Billing information is retrieved from
                your organisation&apos;s database record.
                Stripe checkout remains disabled while
                final subscription safeguards are tested.
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
