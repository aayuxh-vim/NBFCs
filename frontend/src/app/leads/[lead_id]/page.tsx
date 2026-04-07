"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Applicant, Lead } from "@/lib/api";
import { RequireAuth } from "@/components/RequireAuth";

export default function LeadDetailPage() {
  const params = useParams<{ lead_id: string }>();
  const router = useRouter();
  const leadId = decodeURIComponent(params.lead_id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      setLoading(true);
      setError(null);
      try {
        const [l, apps] = await Promise.all([
          api.getLead(leadId),
          api.listApplicantsForLead(leadId),
        ]);
        if (cancelled) return;
        setLead(l);
        setApplicants(apps);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load lead");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  async function onDelete() {
    if (!confirm("Delete this lead?")) return;
    try {
      await api.deleteLead(leadId);
      router.push("/leads");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <RequireAuth>
      {loading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-zinc-600">
          Loading…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : !lead ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-zinc-600">
          Not found.
        </div>
      ) : (
        <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{lead.lead_name}</h1>
          <div className="mt-1 text-sm text-zinc-600">{lead.lead_id}</div>
        </div>
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
        >
          Delete
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 lg:col-span-2">
          <div className="text-sm font-medium text-zinc-700">Lead summary</div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-zinc-500">Phone</dt>
              <dd className="text-sm">{lead.lead_ph_no}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Email</dt>
              <dd className="text-sm">{lead.lead_emailid}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Branch</dt>
              <dd className="text-sm">{lead.lead_branch}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Product</dt>
              <dd className="text-sm">{lead.lead_product}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Loan</dt>
              <dd className="text-sm">
                ₹{Number(lead.lead_loan_amt ?? 0).toLocaleString("en-IN")} @{" "}
                {Number(lead.lead_roi ?? 0).toFixed(2)}% • {lead.lead_tenure}m
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">CIBIL</dt>
              <dd className="text-sm">{lead.cibil_score}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">Address</dt>
              <dd className="text-sm">{lead.lead_address}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-medium text-zinc-700">Applicants</div>
          <div className="mt-3 space-y-2">
            {applicants.map((a) => (
              <div key={a.applicant_id} className="rounded-lg border p-3">
                <div className="text-sm font-medium">
                  {a.salutation} {a.applicant_fname} {a.applicant_lname}
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  {a.prim_contact_number} • {a.prim_emailid}
                </div>
              </div>
            ))}
            {applicants.length === 0 ? (
              <div className="text-sm text-zinc-600">No applicants linked.</div>
            ) : null}
          </div>
        </div>
      </div>
        </div>
      )}
    </RequireAuth>
  );
}

