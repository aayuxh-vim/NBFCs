"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Lead } from "@/lib/api";
import { RequireAuth } from "@/components/RequireAuth";

const emptyLead: Lead = {
  lead_id: "",
  lead_name: "",
  lead_age: 0,
  lead_dob: "",
  lead_ph_no: "",
  lead_branch: "",
  lead_la: "",
  lead_loan_amt: 0,
  lead_roi: 0,
  lead_tenure: 0,
  lead_product: "",
  gender: "",
  lead_address: "",
  lead_emailid: "",
  lead_source: "",
  monthly_income: 0,
  cibil_score: 0,
  employment_type: "",
  secondary_lead_ph_no: "",
  secondary_lead_emailid: "",
  identity_proof_submitted: false,
  lead_category: "",
  region: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-zinc-700">{label}</div>
      {children}
    </label>
  );
}

export default function NewLeadPage() {
  const router = useRouter();
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.createLead({
        ...lead,
        secondary_lead_ph_no: lead.secondary_lead_ph_no?.trim() || null,
        secondary_lead_emailid: lead.secondary_lead_emailid?.trim() || null,
      });
      router.push(`/leads/${encodeURIComponent(created.lead_id)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Create lead</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Writes into the `leads` table via Flask.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="rounded-xl border bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lead ID (primary key)">
            <input
              required
              value={lead.lead_id}
              onChange={(e) => setLead({ ...lead, lead_id: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="LEAD-0001"
            />
          </Field>
          <Field label="Lead name">
            <input
              required
              value={lead.lead_name}
              onChange={(e) => setLead({ ...lead, lead_name: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Age">
            <input
              required
              type="number"
              value={lead.lead_age}
              onChange={(e) =>
                setLead({ ...lead, lead_age: Number(e.target.value) })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="DOB">
            <input
              required
              type="date"
              value={lead.lead_dob}
              onChange={(e) => setLead({ ...lead, lead_dob: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Primary phone">
            <input
              required
              value={lead.lead_ph_no}
              onChange={(e) => setLead({ ...lead, lead_ph_no: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Primary email">
            <input
              required
              type="email"
              value={lead.lead_emailid}
              onChange={(e) =>
                setLead({ ...lead, lead_emailid: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Branch">
            <input
              required
              value={lead.lead_branch}
              onChange={(e) =>
                setLead({ ...lead, lead_branch: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Servicing LA">
            <input
              required
              value={lead.lead_la}
              onChange={(e) => setLead({ ...lead, lead_la: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Product">
            <input
              required
              value={lead.lead_product}
              onChange={(e) =>
                setLead({ ...lead, lead_product: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Gender">
            <input
              required
              value={lead.gender}
              onChange={(e) => setLead({ ...lead, gender: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Male/Female/Other"
            />
          </Field>
          <Field label="Loan amount">
            <input
              required
              type="number"
              step="0.01"
              value={lead.lead_loan_amt}
              onChange={(e) =>
                setLead({ ...lead, lead_loan_amt: Number(e.target.value) })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="ROI (%)">
            <input
              required
              type="number"
              step="0.01"
              value={lead.lead_roi}
              onChange={(e) =>
                setLead({ ...lead, lead_roi: Number(e.target.value) })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Tenure (months)">
            <input
              required
              type="number"
              value={lead.lead_tenure}
              onChange={(e) =>
                setLead({ ...lead, lead_tenure: Number(e.target.value) })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Monthly income">
            <input
              required
              type="number"
              step="0.01"
              value={lead.monthly_income}
              onChange={(e) =>
                setLead({ ...lead, monthly_income: Number(e.target.value) })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="CIBIL score">
            <input
              required
              type="number"
              value={lead.cibil_score}
              onChange={(e) =>
                setLead({ ...lead, cibil_score: Number(e.target.value) })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Employment type">
            <input
              required
              value={lead.employment_type}
              onChange={(e) =>
                setLead({ ...lead, employment_type: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Lead source">
            <input
              required
              value={lead.lead_source}
              onChange={(e) =>
                setLead({ ...lead, lead_source: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Category">
            <input
              required
              value={lead.lead_category}
              onChange={(e) =>
                setLead({ ...lead, lead_category: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Region">
            <input
              required
              value={lead.region}
              onChange={(e) => setLead({ ...lead, region: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Secondary phone (optional)">
            <input
              value={lead.secondary_lead_ph_no ?? ""}
              onChange={(e) =>
                setLead({ ...lead, secondary_lead_ph_no: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Secondary email (optional)">
            <input
              type="email"
              value={lead.secondary_lead_emailid ?? ""}
              onChange={(e) =>
                setLead({ ...lead, secondary_lead_emailid: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Identity proof submitted">
            <select
              value={lead.identity_proof_submitted ? "yes" : "no"}
              onChange={(e) =>
                setLead({
                  ...lead,
                  identity_proof_submitted: e.target.value === "yes",
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          <Field label="Address">
            <input
              required
              value={lead.lead_address}
              onChange={(e) =>
                setLead({ ...lead, lead_address: e.target.value })
              }
              className="w-full rounded-md border px-3 py-2 text-sm sm:col-span-2"
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/leads")}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create"}
          </button>
        </div>
      </form>
    </div>
    </RequireAuth>
  );
}

