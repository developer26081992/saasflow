import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
        <h1 className="mt-8 text-3xl font-bold">Projects</h1>
        <p className="mt-3 text-slate-600">Manage your organisation projects.</p>
        <div className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            This section is ready for implementation.
          </p>
        </div>
      </div>
    </main>
  );
}