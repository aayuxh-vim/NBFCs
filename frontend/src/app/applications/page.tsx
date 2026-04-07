"use client";

import { RequireAuth } from "@/components/RequireAuth";

export default function ApplicationsPage() {
  return (
    <RequireAuth>
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-6">
          <h1 className="text-xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Next step: pipeline view (New → KYC → Verification → Credit → Sanction → Disbursed),
            plus CRUD for `application`, `decision`, `risk_assessment`, `documents`, and `charges`.
          </p>
        </div>
      </div>
    </RequireAuth>
  );
}

