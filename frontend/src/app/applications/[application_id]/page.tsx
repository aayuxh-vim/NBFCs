"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Application, Document as AppDocument } from "@/lib/api";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ArrowLeft,
  BrainCircuit,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const STATUS_ORDER = ["New", "Under Review", "Approved", "Rejected", "Disbursed"];

export default function ApplicationDetailPage() {
  const params = useParams<{ application_id: string }>();
  const router = useRouter();
  const appId = Number(params.application_id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [docs, setDocs] = useState<AppDocument[]>([]);
  const [assessing, setAssessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [a, d] = await Promise.all([
          api.getApplication(appId),
          api.listDocuments(appId),
        ]);
        if (!cancelled) {
          setApp(a);
          setDocs(d);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appId]);

  async function runAssessment() {
    setAssessing(true);
    try {
      const result = await api.assessRisk(appId);
      setApp((prev) =>
        prev
          ? { ...prev, risk_score: result.risk_score, risk_label: result.risk_label }
          : prev
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Assessment failed");
    } finally {
      setAssessing(false);
    }
  }

  async function updateStatus(status: string) {
    try {
      await api.updateApplicationStatus(appId, status);
      setApp((prev) => (prev ? { ...prev, app_status: status } : prev));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (loading) {
    return (
      <RequireAuth>
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          Loading...
        </div>
      </RequireAuth>
    );
  }

  if (error || !app) {
    return (
      <RequireAuth>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {error || "Application not found"}
        </div>
      </RequireAuth>
    );
  }

  const riskScore = app.risk_score;
  const riskLabel = app.risk_label || "pending";
  const isLowRisk = riskLabel === "Low Risk";

  return (
    <RequireAuth>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/applications")}
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Applications
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Application #{app.application_id}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {app.product} &middot; {app.loan_type} &middot; {app.channel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(!app.risk_label || app.risk_label === "pending") && (
              <button
                onClick={runAssessment}
                disabled={assessing}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:opacity-60"
              >
                <BrainCircuit className="h-4 w-4" />
                {assessing ? "Assessing..." : "Run AI Assessment"}
              </button>
            )}
            <select
              value={app.app_status || "New"}
              onChange={(e) => updateStatus(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold shadow-sm"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Risk Score Card */}
          <div
            className={`rounded-xl border p-6 shadow-sm lg:col-span-1 ${
              riskLabel === "pending"
                ? "bg-zinc-50 border-zinc-200"
                : isLowRisk
                ? "bg-zinc-50 border-zinc-300"
                : "bg-zinc-50 border-zinc-300"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <BrainCircuit className="h-3.5 w-3.5" />
              AI Risk Assessment
            </div>
            {riskLabel === "pending" ? (
              <div className="mt-6 text-center">
                <Clock className="mx-auto h-10 w-10 text-zinc-300" strokeWidth={1.5} />
                <div className="mt-3 text-sm text-zinc-500">
                  Not yet assessed
                </div>
                <button
                  onClick={runAssessment}
                  disabled={assessing}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-700"
                >
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Run Assessment
                </button>
              </div>
            ) : (
              <div className="mt-4 text-center">
                {/* Score Gauge */}
                <div className="relative mx-auto h-28 w-28">
                  <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={isLowRisk ? "#18181b" : "#a1a1aa"}
                      strokeWidth="8"
                      strokeDasharray={`${(riskScore ?? 0) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-zinc-900">
                      {riskScore != null ? `${(riskScore * 100).toFixed(0)}%` : "—"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm font-bold text-zinc-800">
                  {isLowRisk ? (
                    <ShieldCheck className="h-4 w-4 text-zinc-600" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-zinc-500" />
                  )}
                  {riskLabel}
                </div>
              </div>
            )}
          </div>

          {/* Loan Details */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              <FileText className="h-3.5 w-3.5" />
              Loan Details
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Product", app.product],
                [
                  "Amount",
                  `₹${Number(app.loan_amount).toLocaleString("en-IN")}`,
                ],
                ["ROI", `${Number(app.loan_roi).toFixed(2)}%`],
                ["Tenure", `${app.loan_tenure} months`],
                ["Branch", app.branch_id],
                ["Servicing LA", app.servicing_la],
                ["Loan Type", app.loan_type],
                ["Channel", app.channel],
                [
                  "Date",
                  new Date(app.application_date).toLocaleDateString("en-IN"),
                ],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs text-zinc-400">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-zinc-800">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <FileText className="h-3.5 w-3.5" />
              Documents ({docs.length})
            </div>
          </div>
          {docs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-8 w-8 text-zinc-200" strokeWidth={1.5} />
              <div className="mt-2 text-sm text-zinc-400">
                No documents uploaded yet.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.document_id}
                  className="rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-semibold text-zinc-800 capitalize">
                        {doc.doc_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {doc.file_url}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.ocr_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-0.5 text-xs font-bold text-zinc-700">
                          <CheckCircle2 className="h-3 w-3" />
                          OCR Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-0.5 text-xs font-bold text-zinc-500">
                          <AlertTriangle className="h-3 w-3" />
                          Not Verified
                        </span>
                      )}
                    </div>
                  </div>
                  {doc.ocr_text && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-zinc-400 mb-1">
                        Extracted Text
                      </div>
                      <pre className="max-h-32 overflow-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-300 whitespace-pre-wrap">
                        {doc.ocr_text}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
