export type Lead = {
  id?: number;
  lead_id: string;
  lead_name: string;
  lead_age: number;
  lead_dob: string; // YYYY-MM-DD
  lead_ph_no: string;
  lead_branch: string;
  lead_la: string;
  lead_loan_amt: number;
  lead_roi: number;
  lead_tenure: number;
  lead_product: string;
  gender: string;
  lead_address: string;
  lead_emailid: string;
  lead_source: string;
  monthly_income: number;
  cibil_score: number;
  employment_type: string;
  secondary_lead_ph_no?: string | null;
  secondary_lead_emailid?: string | null;
  identity_proof_submitted: boolean;
  lead_date?: string;
  lead_updated_at?: string;
  lead_category: string;
  region: string;
};

export type Applicant = {
  applicant_id: number;
  lead_id: string | null;
  salutation: string;
  applicant_fname: string;
  applicant_mname?: string | null;
  applicant_lname: string;
  gender: string;
  age: number;
  prim_contact_number: string;
  sec_contact_number?: string | null;
  prim_emailid: string;
  sec_emailid?: string | null;
  dob: string;
  marital_status: string;
  social_category: string;
  education_qualification: string;
  nationality: string;
  religion?: string | null;
  kyc_ref_no: string;
  relation_with_applicant?: string | null;
  app_type: string;
  monthly_income?: number | null;
  app_date_time?: string | null;
  citizenship?: string | null;
  residential_status?: string | null;
};

async function getAccessToken(): Promise<string | null> {
  // Lazy import to avoid bundling issues and circular deps.
  const { supabase } = await import("./supabaseClient");
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function apiBaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!v) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
  return v.replace(/\/+$/, "");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => apiFetch<{ ok: boolean }>("/api/health"),
  listLeads: (q?: string) =>
    apiFetch<Lead[]>(
      `/api/leads${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      { cache: "no-store" }
    ),
  getLead: (leadId: string) => apiFetch<Lead>(`/api/leads/${encodeURIComponent(leadId)}`),
  createLead: (lead: Lead) =>
    apiFetch<Lead>("/api/leads", { method: "POST", body: JSON.stringify(lead) }),
  deleteLead: (leadId: string) =>
    apiFetch<{ deleted: boolean }>(`/api/leads/${encodeURIComponent(leadId)}`, { method: "DELETE" }),
  listApplicantsForLead: (leadId: string) =>
    apiFetch<Applicant[]>(`/api/leads/${encodeURIComponent(leadId)}/applicants`),
};

