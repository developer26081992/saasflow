
import Link from "next/link";
import {
  OrganizationSwitcher,
  UserButton,
} from "@clerk/nextjs";

import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CreditCard,
  Settings,
  ArrowUpRight,
  Layers,
  Plus,
  Activity,
  ShieldCheck,
} from "lucide-react";

const stats = [
  {
    title: "Total Projects",
    value: "12",
    icon: FolderKanban,
    description: "Projects in your workspace",
  },
  {
    title: "Team Members",
    value: "5",
    icon: Users,
    description: "Active organisation members",
  },
  {
    title: "Current Plan",
    value: "FREE",
    icon: CreditCard,
    description: "Upgrade to unlock more features",
  },
  {
    title: "Projects Remaining",
    value: "3",
    icon: Activity,
    description: "Illustrative usage allowance",
  },
];

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Projects",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    name: "Members",
    href: "/dashboard/members",
    icon: Users,
  },
  {
    name: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full bg-slate-950 p-6 text-white md:min-h-screen md:w-64">
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2">
              <Layers size={24} />
            </div>

            <div>
              <h1 className="text-xl font-bold">
                SaaSFlow
              </h1>
              <p className="text-xs text-slate-400">
                Organisation Platform
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 rounded-xl bg-slate-800 p-4">
            <ShieldCheck
              size={25}
              className="mb-3 text-blue-400"
            />

            <h3 className="font-semibold">
              Free Plan
            </h3>

            <p className="mt-2 text-xs text-slate-400">
              Upgrade your organisation to access
              premium features.
            </p>

            <Link
              href="/dashboard/billing"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Upgrade Plan
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-5 md:p-10">
          <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Organisation Dashboard
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Welcome to SaaSFlow
              </h2>

              <p className="mt-2 text-slate-500">
                Manage your organisation, projects,
                members and subscription.
              </p>
            </div>

            {/* Clerk Organisation and User Management */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white px-4 py-3 shadow-sm">
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
              />

              <UserButton
                afterSignOutUrl="/sign-in"
              />
            </div>
          </header>

          {/* Statistics */}
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      {stat.title}
                    </p>

                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                      <Icon size={20} />
                    </div>
                  </div>

                  <h3 className="text-3xl font-bold">
                    {stat.value}
                  </h3>

                  <p className="mt-3 text-xs text-slate-500">
                    {stat.description}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Dashboard Panels */}
          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Recent Projects */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">
                    Recent Projects
                  </h3>

                  <p className="text-sm text-slate-500">
                    Example project records
                  </p>
                </div>

                <FolderKanban className="text-blue-600" />
              </div>

              {[
                "Website Redesign",
                "Customer Portal",
                "Analytics Dashboard",
              ].map((project) => (
                <div
                  key={project}
                  className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 p-3">
                      <FolderKanban size={18} />
                    </div>

                    <div>
                      <p className="font-medium">
                        {project}
                      </p>

                      <p className="text-xs text-slate-500">
                        Demo project
                      </p>
                    </div>
                  </div>

                  <ArrowUpRight
                    size={18}
                    className="text-slate-400"
                  />
                </div>
              ))}
            </div>

            {/* Subscription Usage */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">
                Subscription Usage
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Example FREE plan usage
              </p>

              <div className="mt-8 flex justify-between text-sm">
                <span>Projects Used</span>
                <span className="font-semibold">
                  2 / 5
                </span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/5 rounded-full bg-blue-600" />
              </div>

              <p className="mt-5 text-sm text-slate-500">
                Upgrade your subscription to increase
                your organisation limits.
              </p>

              <Link
                href="/dashboard/billing"
                className="mt-6 inline-block rounded-lg bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                Manage Billing
              </Link>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-bold">
              Quick Actions
            </h3>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/projects"
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus size={18} />
                Projects
              </Link>

              <Link
                href="/dashboard/members"
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-5 py-3 text-sm font-medium hover:bg-slate-200"
              >
                <Users size={18} />
                Members
              </Link>

              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-5 py-3 text-sm font-medium hover:bg-slate-200"
              >
                <Settings size={18} />
                Settings
              </Link>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-10 text-center text-xs text-slate-400">
            SaaSFlow © 2026 | IQA Practical Examination Practice
          </footer>
        </main>
      </div>
    </div>
  );
}
