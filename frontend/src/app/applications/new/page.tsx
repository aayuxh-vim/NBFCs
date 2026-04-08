"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { RequireAuth } from "@/components/RequireAuth";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  ShieldCheck,
  ShieldAlert,
  BrainCircuit,
} from "lucide-react";

const STEPS = ["Personal Info", "Financial Details", "Documents", "Review & Submit"];

const SALUTATIONS = ["Mr.", "Ms.", "Mrs.", "Dr."];
const GENDERS = ["Male", "Female", "Other"];
const MARITAL = ["Single", "Married", "Divorced", "Widowed"];
const SOCIAL_CAT = ["General", "OBC", "SC", "ST"];
const EDUCATION = [
  "Below 10th",
  "10th Pass",
  "12th Pass",
  "Graduate",
  "Post Graduate",
  "Professional",
];
const EMPLOYMENT = ["salaried", "self_employed", "business", "freelancer", "retired"];
const PRODUCTS = ["Personal Loan", "Home Loan", "Vehicle Loan", "Business Loan", "Gold Loan"];
const LOAN_TYPES = ["Secured", "Unsecured"];
const CHANNELS = ["Branch", "Online", "DSA", "Referral"];
const APP_TYPES = ["Primary", "Co-Applicant", "Guarantor"];
const DOC_TYPES = ["id_proof", "bank_statement", "income_proof", "address_proof"];

type FormData = {
  // Step 1 — Personal
  salutation: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  age: string;
  dob: string;
  phone: string;
  email: string;
  marital_status: string;
  social_category: string;
  education: string;
  nationality: string;
  kyc_ref_no: string;
  app_type: string;
  // Step 2 — Financial
  monthly_income: string;
  cibil_score: string;
  employment_type: string;
  product: string;
  branch_id: string;
  loan_amount: string;
  loan_roi: string;
  loan_tenure: string;
  loan_type: string;
  channel: string;
  servicing_la: string;
};

const emptyForm: FormData = {
  salutation: "Mr.",
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "Male",
  age: "",
  dob: "",
  phone: "",
  email: "",
  marital_status: "Single",
  social_category: "General",
  education: "Graduate",
  nationality: "Indian",
  kyc_ref_no: "",
  app_type: "Primary",
  monthly_income: "",
  cibil_score: "",
  employment_type: "salaried",
  product: "Personal Loan",
  branch_id: "",
  loan_amount: "",
  loan_roi: "",
  loan_tenure: "12",
  loan_type: "Unsecured",
  channel: "Branch",
  servicing_la: "",
};

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20";
const selectClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20";

export default function NewApplicationPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [files, setFiles] = useState<{ file: File; doc_type: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskPreview, setRiskPreview] = useState<{
    risk_score: number;
    risk_label: string;
  } | null>(null);

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm({ ...form, [field]: e.target.value });

  // ---------- validation ----------

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!form.first_name.trim()) return "First name is required";
      if (!form.last_name.trim()) return "Last name is required";
      if (!form.dob) return "Date of birth is required";
      const age = Number(form.age);
      if (!age || age < 18) return "Applicant must be 18 or older";
      if (!form.phone.trim() || form.phone.length < 6) return "Valid phone required";
      if (!form.email.includes("@")) return "Valid email required";
      if (!form.kyc_ref_no.trim()) return "KYC reference number is required";
    }
    if (s === 1) {
      if (!form.monthly_income || Number(form.monthly_income) <= 0) return "Monthly income must be > 0";
      if (!form.cibil_score || Number(form.cibil_score) < 300) return "CIBIL score must be ≥ 300";
      if (!form.loan_amount || Number(form.loan_amount) <= 0) return "Loan amount must be > 0";
      if (!form.branch_id.trim()) return "Branch ID is required";
      if (!form.servicing_la.trim()) return "Servicing LA is required";
    }
    return null;
  }

  async function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    // After financial step, preview risk
    if (step === 1) {
      try {
        const preview = await api.predictRisk({
          monthly_income: Number(form.monthly_income),
          cibil_score: Number(form.cibil_score),
          employment_type: form.employment_type,
          loan_amount: Number(form.loan_amount),
          loan_tenure: Number(form.loan_tenure),
          age: Number(form.age),
        });
        setRiskPreview(preview);
      } catch {
        // non-blocking
      }
    }
    setStep(step + 1);
  }

  function goBack() {
    setError(null);
    setStep(step - 1);
  }

  // ---------- submit ----------

  async function onSubmit() {
    setSaving(true);
    setError(null);
    try {
      // 1) Create applicant
      const applicant = await api.createApplicant({
        lead_id: null,
        salutation: form.salutation,
        applicant_fname: form.first_name,
        applicant_mname: form.middle_name || null,
        applicant_lname: form.last_name,
        gender: form.gender,
        age: Number(form.age),
        prim_contact_number: form.phone,
        prim_emailid: form.email,
        dob: form.dob,
        marital_status: form.marital_status,
        social_category: form.social_category,
        education_qualification: form.education,
        nationality: form.nationality,
        kyc_ref_no: form.kyc_ref_no,
        app_type: form.app_type,
        monthly_income: Number(form.monthly_income),
        citizenship: form.nationality,
        residential_status: "Resident",
      });

      // 2) Create application
      const application = await api.createApplication({
        applicant_id: applicant.applicant_id,
        product: form.product,
        branch_id: form.branch_id,
        loan_amount: Number(form.loan_amount),
        loan_roi: Number(form.loan_roi) || 12,
        loan_tenure: Number(form.loan_tenure),
        servicing_la: form.servicing_la,
        application_date: new Date().toISOString(),
        app_processing_duration: 0,
        app_status: "New",
        loan_type: form.loan_type,
        channel: form.channel,
      });

      // 3) Upload documents
      for (const { file, doc_type } of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("application_id", String(application.application_id));
        fd.append("applicant_id", String(applicant.applicant_id));
        fd.append("doc_type", doc_type);
        await api.uploadDocument(fd);
      }

      // 4) Run risk assessment
      await api.assessRisk(application.application_id);

      router.push(`/applications/${application.application_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSaving(false);
    }
  }

  // ---------- render ----------

  return (
    <RequireAuth>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            New Loan Application
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Complete all steps to submit your application for AI risk assessment.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    i < step
                      ? "bg-zinc-900 text-white"
                      : i === step
                      ? "bg-zinc-900 text-white ring-4 ring-zinc-900/10"
                      : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={`hidden text-xs font-medium sm:inline ${
                    i <= step ? "text-zinc-900" : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 hidden h-px w-8 sm:block ${
                      i < step ? "bg-zinc-900" : "bg-zinc-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-zinc-800">Personal Information</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Salutation" required>
                  <select value={form.salutation} onChange={set("salutation")} className={selectClass}>
                    {SALUTATIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="First Name" required>
                  <input value={form.first_name} onChange={set("first_name")} className={inputClass} placeholder="Rahul" />
                </Field>
                <Field label="Middle Name">
                  <input value={form.middle_name} onChange={set("middle_name")} className={inputClass} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Last Name" required>
                  <input value={form.last_name} onChange={set("last_name")} className={inputClass} placeholder="Sharma" />
                </Field>
                <Field label="Gender" required>
                  <select value={form.gender} onChange={set("gender")} className={selectClass}>
                    {GENDERS.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Date of Birth" required>
                  <input type="date" value={form.dob} onChange={set("dob")} className={inputClass} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Age" required>
                  <input type="number" value={form.age} onChange={set("age")} className={inputClass} min={18} />
                </Field>
                <Field label="Phone" required>
                  <input value={form.phone} onChange={set("phone")} className={inputClass} placeholder="9876543210" />
                </Field>
                <Field label="Email" required>
                  <input type="email" value={form.email} onChange={set("email")} className={inputClass} placeholder="rahul@email.com" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Marital Status" required>
                  <select value={form.marital_status} onChange={set("marital_status")} className={selectClass}>
                    {MARITAL.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Social Category">
                  <select value={form.social_category} onChange={set("social_category")} className={selectClass}>
                    {SOCIAL_CAT.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Education">
                  <select value={form.education} onChange={set("education")} className={selectClass}>
                    {EDUCATION.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Nationality">
                  <input value={form.nationality} onChange={set("nationality")} className={inputClass} />
                </Field>
                <Field label="KYC Ref No" required>
                  <input value={form.kyc_ref_no} onChange={set("kyc_ref_no")} className={inputClass} placeholder="KYC-0001" />
                </Field>
                <Field label="Applicant Type">
                  <select value={form.app_type} onChange={set("app_type")} className={selectClass}>
                    {APP_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-zinc-800">Financial Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monthly Income (₹)" required>
                  <input type="number" value={form.monthly_income} onChange={set("monthly_income")} className={inputClass} placeholder="50000" />
                </Field>
                <Field label="CIBIL Score" required>
                  <input type="number" value={form.cibil_score} onChange={set("cibil_score")} className={inputClass} min="300" max="900" placeholder="750" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Employment Type" required>
                  <select value={form.employment_type} onChange={set("employment_type")} className={selectClass}>
                    {EMPLOYMENT.map((e) => (
                      <option key={e} value={e}>
                        {e.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Product" required>
                  <select value={form.product} onChange={set("product")} className={selectClass}>
                    {PRODUCTS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Loan Amount (₹)" required>
                  <input type="number" value={form.loan_amount} onChange={set("loan_amount")} className={inputClass} placeholder="500000" />
                </Field>
                <Field label="ROI (%)" required>
                  <input type="number" step="0.01" value={form.loan_roi} onChange={set("loan_roi")} className={inputClass} placeholder="12.5" />
                </Field>
                <Field label="Tenure (months)" required>
                  <input type="number" value={form.loan_tenure} onChange={set("loan_tenure")} className={inputClass} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Branch ID" required>
                  <input value={form.branch_id} onChange={set("branch_id")} className={inputClass} placeholder="BR-001" />
                </Field>
                <Field label="Servicing LA" required>
                  <input value={form.servicing_la} onChange={set("servicing_la")} className={inputClass} placeholder="LA-001" />
                </Field>
                <Field label="Loan Type">
                  <select value={form.loan_type} onChange={set("loan_type")} className={selectClass}>
                    {LOAN_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Channel">
                <select value={form.channel} onChange={set("channel")} className={selectClass}>
                  {CHANNELS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-zinc-800">Upload Documents</h2>
              <p className="text-sm text-zinc-500">
                Upload PDF documents for verification. Our AI will automatically extract and verify the text.
              </p>
              {DOC_TYPES.map((dt) => {
                const existing = files.find((f) => f.doc_type === dt);
                return (
                  <div
                    key={dt}
                    className="flex items-center justify-between rounded-lg border border-dashed border-zinc-300 p-4 transition-colors hover:border-zinc-500 hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                      <div>
                        <div className="text-sm font-medium text-zinc-800">
                          {dt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </div>
                        {existing && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-600 font-medium">
                            <Check className="h-3 w-3" />
                            {existing.file.name} ({(existing.file.size / 1024).toFixed(0)} KB)
                          </div>
                        )}
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-700">
                      <Upload className="h-3 w-3" />
                      {existing ? "Replace" : "Upload PDF"}
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setFiles((prev) => [
                            ...prev.filter((f) => f.doc_type !== dt),
                            { file, doc_type: dt },
                          ]);
                        }}
                      />
                    </label>
                  </div>
                );
              })}
              <p className="text-xs text-zinc-400">
                Documents are optional but recommended for faster processing.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-zinc-800">Review & Submit</h2>
              {riskPreview && (
                <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    AI Risk Assessment Preview
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-3xl font-black text-zinc-900">
                      {(riskPreview.risk_score * 100).toFixed(0)}%
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm font-bold text-zinc-800">
                      {riskPreview.risk_label === "Low Risk" ? (
                        <ShieldCheck className="h-4 w-4 text-zinc-600" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-zinc-500" />
                      )}
                      {riskPreview.risk_label}
                    </span>
                  </div>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                    Personal Details
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Name</dt>
                      <dd className="font-medium">{form.salutation} {form.first_name} {form.last_name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Age / Gender</dt>
                      <dd className="font-medium">{form.age} / {form.gender}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Phone</dt>
                      <dd className="font-medium">{form.phone}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Email</dt>
                      <dd className="font-medium text-xs">{form.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Education</dt>
                      <dd className="font-medium">{form.education}</dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-lg border border-zinc-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                    Financial Details
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Income</dt>
                      <dd className="font-medium">₹{Number(form.monthly_income).toLocaleString("en-IN")}/mo</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">CIBIL</dt>
                      <dd className="font-medium">{form.cibil_score}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Loan</dt>
                      <dd className="font-medium">₹{Number(form.loan_amount).toLocaleString("en-IN")}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Tenure</dt>
                      <dd className="font-medium">{form.loan_tenure} months</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Product</dt>
                      <dd className="font-medium">{form.product}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Employment</dt>
                      <dd className="font-medium capitalize">{form.employment_type.replace("_", " ")}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              {files.length > 0 && (
                <div className="rounded-lg border border-zinc-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                    Documents ({files.length})
                  </div>
                  {files.map((f) => (
                    <div key={f.doc_type} className="flex items-center gap-2 text-sm py-1">
                      <Check className="h-3.5 w-3.5 text-zinc-600" />
                      <span className="font-medium capitalize">{f.doc_type.replace(/_/g, " ")}</span>
                      <span className="text-zinc-400">— {f.file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={step === 0 ? () => router.push("/applications") : goBack}
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            disabled={saving}
          >
            {step === 0 ? "Cancel" : <><ChevronLeft className="inline h-4 w-4" /> Back</>}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:opacity-60"
            >
              {saving ? "Submitting…" : "Submit Application"}
            </button>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
