"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, Lead } from "@/lib/api";
import { RequireAuth } from "@/components/RequireAuth";

export default function LeadsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Lead[]>([]);

  const filtered = useMemo(() => rows, [rows]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.listLeads();
        if (cancelled) return;
        setRows(data);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load leads");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listLeads(q.trim() || undefined);
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-zinc-600">
            List and search your leads from Supabase.
          </p>
        </div>
        <Link
          href="/leads/new"
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Create lead
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / phone / lead id / email"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          />
          <button
            onClick={onSearch}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Search
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
          <div className="mt-2 text-xs text-red-700">
            Check `NEXT_PUBLIC_API_BASE_URL` and that Flask is running.
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-4 py-3 text-sm font-medium text-zinc-700">
          {loading ? "Loading…" : `${filtered.length} lead(s)`}
        </div>
        <div className="divide-y">
          {filtered.map((l) => (
            <div key={l.lead_id} className="px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    href={`/leads/${encodeURIComponent(l.lead_id)}`}
                    className="font-medium text-zinc-950 hover:underline"
                  >
                    {l.lead_name}
                  </Link>
                  <div className="text-xs text-zinc-600">
                    {l.lead_id} • {l.lead_ph_no} • {l.lead_branch} • {l.lead_product}
                  </div>
                </div>
                <div className="text-sm text-zinc-700">
                  ₹{Number(l.lead_loan_amt ?? 0).toLocaleString("en-IN")} @{" "}
                  {Number(l.lead_roi ?? 0).toFixed(2)}% • {l.lead_tenure}m
                </div>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">
              No leads found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
    </RequireAuth>
  );
}

