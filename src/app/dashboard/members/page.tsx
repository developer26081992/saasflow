
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: number | string;
};

export default function MembersPage() {
  const { organization, isLoaded, membership } =
    useOrganization();

  const [members, setMembers] = useState<Member[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showInviteForm, setShowInviteForm] =
    useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");

  const isAdmin = membership?.role === "org:admin";

  const loadMembers = useCallback(
    async (signal?: AbortSignal) => {
      if (!organization) {
        setMembers([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/members", {
          cache: "no-store",
          signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load members"
          );
        }

        if (!signal?.aborted) {
          setMembers(data.members ?? []);
          setTotalCount(data.totalCount ?? 0);
        }
      } catch (err) {
        if (!signal?.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load members"
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

    setMembers([]);
    setTotalCount(0);
    setInviteMessage("");
    setShowInviteForm(false);

    loadMembers(controller.signal);

    return () => controller.abort();
  }, [isLoaded, loadMembers]);

  async function sendInvitation(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!organization || !isAdmin || inviting) return;

    setInviting(true);
    setError("");
    setInviteMessage("");

    try {
      const response = await fetch(
        "/api/members/invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: inviteEmail.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to send invitation"
        );
      }

      setInviteMessage(
        "Invitation sent successfully. The recipient can join after accepting it."
      );

      setInviteEmail("");
      setShowInviteForm(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send invitation"
      );
    } finally {
      setInviting(false);
    }
  }

  const filteredMembers = members.filter((member) => {
    const query = search.trim().toLowerCase();

    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query)
    );
  });

  function formatRole(role: string) {
    if (role === "org:admin") return "Administrator";
    if (role === "org:member") return "Member";
    return role.replace("org:", "");
  }

  function formatDate(value: number | string) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Unknown"
      : date.toLocaleDateString("en-GB");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
              SaaSFlow Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Organisation Members
            </h1>

            <p className="mt-3 text-slate-600">
              View and manage your organisation&apos;s
              team.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadMembers()}
              disabled={loading || !organization}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-5 py-3 font-semibold hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw size={18} />
              Refresh
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowInviteForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
              >
                <Plus size={18} />
                Invite Member
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <Users
              className="text-blue-600"
              size={25}
            />
            <p className="mt-4 text-sm text-slate-500">
              Total Members
            </p>
            <p className="mt-2 text-3xl font-bold">
              {totalCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <ShieldCheck
              className="text-blue-600"
              size={25}
            />
            <p className="mt-4 text-sm text-slate-500">
              Administrators Shown
            </p>
            <p className="mt-2 text-3xl font-bold">
              {
                members.filter(
                  (member) =>
                    member.role === "org:admin"
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <Building2
              className="text-blue-600"
              size={25}
            />
            <p className="mt-4 text-sm text-slate-500">
              Current Organisation
            </p>
            <p className="mt-2 text-lg font-bold">
              {organization?.name ?? "Not selected"}
            </p>
          </div>
        </div>

        {inviteMessage && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {inviteMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-xl font-bold">
              Team Directory
            </h2>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3 text-slate-400"
              />

              <input
                type="search"
                placeholder="Search members..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-4 text-sm sm:w-64"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2
                size={30}
                className="animate-spin text-blue-600"
              />
            </div>
          ) : !organization ? (
            <div className="py-16 text-center text-slate-500">
              Select an organisation to view members.
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              No matching members found.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600">
                    <th className="px-4 py-4">
                      Member
                    </th>
                    <th className="px-4 py-4">
                      Email
                    </th>
                    <th className="px-4 py-4">
                      Role
                    </th>
                    <th className="px-4 py-4">
                      Joined
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                            <UserRound size={19} />
                          </div>

                          <span className="font-semibold">
                            {member.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {member.email}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {formatRole(member.role)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={15} />
                          {formatDate(
                            member.joinedAt
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Invite Team Member
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowInviteForm(false)
                }
                aria-label="Close invitation form"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Invite someone to join{" "}
              <strong>
                {organization?.name}
              </strong>{" "}
              as a member.
            </p>

            <form
              onSubmit={sendInvitation}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="inviteEmail"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    id="inviteEmail"
                    type="email"
                    required
                    maxLength={254}
                    value={inviteEmail}
                    onChange={(event) =>
                      setInviteEmail(
                        event.target.value
                      )
                    }
                    placeholder="person@example.com"
                    className="w-full rounded-xl border py-3 pl-10 pr-4"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowInviteForm(false)
                  }
                  className="rounded-xl border px-5 py-3"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={inviting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {inviting && (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  )}

                  {inviting
                    ? "Sending..."
                    : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

