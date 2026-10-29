
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import {
  ArrowLeft,
  FolderKanban,
  FolderPlus,
  Search,
  X,
  CalendarDays,
  Building2,
  Loader2,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export default function ProjectsPage() {
  const { organization, isLoaded } = useOrganization();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!organization) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadProjects() {
      setLoading(true);
      setProjects([]);
      setError("");

      try {
        const response = await fetch("/api/projects", {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load projects"
          );
        }

        if (!controller.signal.aborted) {
          setProjects(data.projects ?? []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load projects"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => controller.abort();
  }, [organization?.id, isLoaded]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organization || !projectName.trim() || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create project"
        );
      }

      setProjects((previous) => [data.project, ...previous]);
      setProjectName("");
      setProjectDescription("");
      setShowCreateForm(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create project"
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredProjects = projects.filter((project) => {
    const query = search.toLowerCase();

    return (
      project.name.toLowerCase().includes(query) ||
      (project.description ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
              SaaSFlow Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Projects
            </h1>

            <p className="mt-3 text-slate-600">
              Manage projects belonging to your organisation.
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            disabled={!organization || !isLoaded}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <FolderPlus size={19} />
            Create Project
          </button>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Total Projects
              </span>
              <FolderKanban className="text-blue-600" />
            </div>
            <p className="mt-4 text-3xl font-bold">
              {projects.length}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Current Organisation
              </span>
              <Building2 className="text-blue-600" />
            </div>
            <p className="mt-4 text-lg font-bold">
              {organization?.name ?? "Not selected"}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-xl font-bold">All Projects</h2>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                type="search"
                placeholder="Search projects..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-4 text-sm sm:w-64"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-blue-600" size={30} />
            </div>
          ) : !organization ? (
            <div className="py-16 text-center text-slate-500">
              Select an organisation to view its projects.
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 text-center">
              <FolderKanban
                size={48}
                className="mx-auto text-slate-300"
              />
              <h3 className="mt-4 text-lg font-semibold">
                {search ? "No matching projects" : "No projects yet"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Try a different search."
                  : "Create your first project to get started."}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-xl border p-5 hover:shadow-md"
                >
                  <FolderKanban className="text-blue-600" size={25} />

                  <h3 className="mt-4 text-lg font-bold">
                    {project.name}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {project.description || "No description provided."}
                  </p>

                  <div className="mt-5 flex items-center gap-2 border-t pt-4 text-xs text-slate-500">
                    <CalendarDays size={15} />
                    Created{" "}
                    {new Date(project.createdAt).toLocaleDateString("en-GB")}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Create New Project
              </h2>

              <button
                onClick={() => setShowCreateForm(false)}
                aria-label="Close"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createProject} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="projectName"
                  className="mb-2 block text-sm font-semibold"
                >
                  Project Name
                </label>

                <input
                  id="projectName"
                  required
                  maxLength={100}
                  value={projectName}
                  onChange={(event) =>
                    setProjectName(event.target.value)
                  }
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="e.g. School Management System"
                />
              </div>

              <div>
                <label
                  htmlFor="projectDescription"
                  className="mb-2 block text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="projectDescription"
                  rows={4}
                  maxLength={500}
                  value={projectDescription}
                  onChange={(event) =>
                    setProjectDescription(event.target.value)
                  }
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="Describe your project..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-xl border px-5 py-3"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 size={18} className="animate-spin" />
                  )}
                  {saving ? "Saving..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
