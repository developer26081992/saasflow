
"use client";

import { useCallback, useEffect, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import {
  Building2,
  Save,
  ShieldCheck,
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";

type OrganisationSettings = {
  id: string;
  name: string;
  slug: string | null;
  createdAt: number;
};

export default function OrganisationSettingsPage() {
  const { organization, membership, isLoaded } =
    useOrganization();

  const [settings, setSettings] =
    useState<OrganisationSettings | null>(null);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = membership?.role === "org:admin";

  const loadSettings = useCallback(async () => {
    if (!organization) {
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/organisation/settings",
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load settings"
        );
      }

      setSettings(data.organisation);
      setName(data.organisation.name);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load settings"
      );
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (isLoaded) {
      void loadSettings();
    }
  }, [isLoaded, loadSettings]);

  async function saveSettings() {
    if (!isAdmin || saving) return;

    setError("");
    setSuccess("");

    const trimmedName = name.trim();

    if (
      trimmedName.length < 2 ||
      trimmedName.length > 100
    ) {
      setError(
        "Organisation name must be 2–100 characters."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/organisation/settings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save changes"
        );
      }

      setSettings((current) =>
        current
          ? {
              ...current,
              name: data.organisation.name,
              slug: data.organisation.slug,
            }
          : current
      );

      setName(data.organisation.name);
      setSuccess(
        "Organisation settings saved successfully."
      );

      // Refresh Clerk's organisation data.
      await organization?.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save settings"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-600">
              <Settings className="h-4 w-4" />
              ORGANISATION MANAGEMENT
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Organisation Settings
            </h1>

            <p className="mt-2 text-slate-500">
              View and manage your organisation information.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={loading || !organization}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            <span>{success}</span>
          </div>
        )}

        {!isLoaded || loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading organisation settings...
          </div>
        ) : !organization ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <h2 className="font-semibold text-slate-900">
              No organisation selected
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Select an organisation from the dashboard
              to manage its settings.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
                    <Building2 className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      General Information
                    </h2>
                    <p className="text-sm text-slate-500">
                      Your organisation profile.
                    </p>
                  </div>
                </div>

                <label
                  htmlFor="organisation-name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Organisation Name
                </label>

                <input
                  id="organisation-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  disabled={!isAdmin || saving}
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  {isAdmin
                    ? "You can update the organisation name."
                    : "Only administrators can edit organisation details."}
                </p>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Organisation Slug
                  </label>

                  <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    {settings?.slug || "Not configured"}
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => void saveSettings()}
                    disabled={
                      saving ||
                      name.trim() === settings?.name
                    }
                    className="mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                    <ShieldCheck className="h-6 w-6" />
                  </div>

                  <h2 className="font-semibold text-slate-900">
                    Access & Security
                  </h2>
                </div>

                <p className="text-sm text-slate-500">
                  Your current organisation role:
                </p>

                <div className="mt-3 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800">
                  {isAdmin ? "Administrator" : "Member"}
                </div>

                <div className="mt-5 flex items-start gap-2 text-sm text-slate-500">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Sensitive changes are protected
                    by server-side role checks.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
