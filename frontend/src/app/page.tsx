import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";

export default function Home() {
  return (
    <RequireAuth>
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-6">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Lead intake, application processing, decisioning, and loan servicing.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/leads"
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Leads
            </Link>
            <Link
              href="/applications"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Applications
            </Link>
            <Link
              href="/leads/new"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Create lead
            </Link>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
