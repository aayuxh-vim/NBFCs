"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Application } from "@/lib/api";
import { RequireAuth } from "@/components/RequireAuth";
import {
  Plus,
  LayoutGrid,
  LayoutList,
  BrainCircuit,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from "lucide-react";

const STATUS_ORDER = ["New", "Under Review", "Approved", "Rejected", "Disbursed"];

const STATUS_STYLES: Record<string, string> = {
  New: "bg-zinc-100 text-zinc-700",
  "Under Review": "bg-zinc-200 text-zinc-700",
  Approved: "bg-zinc-800 text-white",
  Rejected: "bg-zinc-300 text-zinc-600",
  Disbursed: "bg-zinc-900 text-white",
};

function RiskBadge({ score, label }: { score?: number | null; label?: string | null }) {
  if (!label || label === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-400">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  const isLow = label === "Low Risk";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
        isLow
          ? "border-zinc-400 bg-white text-zinc-800"
          : "border-zinc-300 bg-zinc-100 text-zinc-600"
      }`}
    >
      {isLow ? (
        <ShieldCheck className="h-3 w-3" />
      ) : (
        <ShieldAlert className="h-3 w-3" />
      )}
      {score != null ? `${(score * 100).toFixed(0)}%` : ""} {label}
    </span>
  );
}

export default function ApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Application[]>([]);
  const [view, setView] = useState<"table" | "pipeline">("table");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.listApplications();
        if (!cancelled) setRows(data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleAssess(id: number) {
    try {
      const result = await api.assessRisk(id);
      setRows((prev) =>
        prev.map((r) =>
          r.application_id === id
            ? { ...r, risk_score: result.risk_score, risk_label: result.risk_label }
            : r
        )
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Assessment failed");
    }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await api.updateApplicationStatus(id, status);
      setRows((prev) =>
        prev.map((r) =>
          r.application_id === id ? { ...r, app_status: status } : r
        )
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Status update failed");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const sa = a.risk_score ?? -1;
    const sb = b.risk_score ?? -1;
    return sb - sa;
  });

  return (
    <RequireAuth>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Applications
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Manage loan applications, run AI risk assessments, and update statuses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(view === "table" ? "pipeline" : "table")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              {view === "table" ? (
                <>
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Pipeline
                </>
              ) : (
                <>
                  <LayoutList className="h-3.5 w-3.5" />
                  Table
                </>
              )}
            </button>
            <Link
              href="/applications/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700"
            >
              <Plus className="h-4 w-4" />
              New Application
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
            <div className="mt-1 text-xs text-red-600">
              Check that Flask is running on port 5001.
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            Loading applications...
          </div>
        ) : view === "table" ? (
          /* ---------- TABLE VIEW ---------- */
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-700">
              {sorted.length} application(s) &mdash; sorted by risk score
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Loan Amount</th>
                    <th className="px-5 py-3">Tenure</th>
                    <th className="px-5 py-3">Risk Score</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sorted.map((app) => (
                    <tr
                      key={app.application_id}
                      className="transition-colors hover:bg-zinc-50/60"
                    >
                      <td className="px-5 py-3 font-medium">
                        <Link
                          href={`/applications/${app.application_id}`}
                          className="text-zinc-900 hover:text-zinc-600 hover:underline"
                        >
                          #{app.application_id}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{app.product}</td>
                      <td className="px-5 py-3 text-zinc-600">
                        ₹{Number(app.loan_amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{app.loan_tenure}m</td>
                      <td className="px-5 py-3">
                        <RiskBadge score={app.risk_score} label={app.risk_label} />
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={app.app_status || "New"}
                          onChange={(e) =>
                            handleStatusChange(app.application_id, e.target.value)
                          }
                          className={`rounded-full px-2.5 py-1 text-xs font-bold border-0 cursor-pointer ${
                            STATUS_STYLES[app.app_status || "New"] || "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        {(!app.risk_label || app.risk_label === "pending") && (
                          <button
                            onClick={() => handleAssess(app.application_id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700"
                          >
                            <BrainCircuit className="h-3 w-3" />
                            Run AI
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-zinc-400">
                        No applications yet.{" "}
                        <Link
                          href="/applications/new"
                          className="text-zinc-900 font-semibold hover:underline"
                        >
                          Create one
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ---------- PIPELINE VIEW ---------- */
          <div className="grid grid-cols-5 gap-3">
            {STATUS_ORDER.map((status) => {
              const items = rows.filter(
                (r) => (r.app_status || "New") === status
              );
              return (
                <div
                  key={status}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/50"
                >
                  <div className="border-b border-zinc-200 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          STATUS_STYLES[status] || "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {status}
                      </span>
                      <span className="text-xs text-zinc-400 font-semibold">
                        {items.length}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 p-2">
                    {items.map((app) => (
                      <Link
                        key={app.application_id}
                        href={`/applications/${app.application_id}`}
                        className="block rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-zinc-300"
                      >
                        <div className="text-xs font-bold text-zinc-900">
                          #{app.application_id}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {app.product}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-zinc-700">
                          ₹{Number(app.loan_amount).toLocaleString("en-IN")}
                        </div>
                        <div className="mt-2">
                          <RiskBadge
                            score={app.risk_score}
                            label={app.risk_label}
                          />
                        </div>
                      </Link>
                    ))}
                    {items.length === 0 && (
                      <div className="py-6 text-center text-xs text-zinc-400">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
