# NBFC Database — Triggers, Functions & Procedures Reference

> **File:** `backend/triggers.sql`
> Run the entire file once in **Supabase Dashboard → SQL Editor** to install everything.

---

## Table of Contents

1. [Functions](#functions)
   - [fn_set_updated_at](#fn_set_updated_at)
   - [fn_log_status_change](#fn_log_status_change)
   - [fn_calculate_emi](#fn_calculate_emi)
   - [fn_get_portfolio_summary](#fn_get_portfolio_summary)
2. [Triggers](#triggers)
   - [trg_lead_updated_at](#trg_lead_updated_at)
   - [trg_applicant_updated_at](#trg_applicant_updated_at)
   - [trg_application_updated_at](#trg_application_updated_at)
   - [trg_document_updated_at](#trg_document_updated_at)
   - [trg_application_status_audit](#trg_application_status_audit)
3. [Procedures](#procedures)
   - [sp_approve_and_disburse](#sp_approve_and_disburse)
4. [Supporting Tables](#supporting-tables)
   - [application_status_log](#application_status_log)
   - [disbursement_log](#disbursement_log)

---

## Functions

### `fn_set_updated_at`

| Property | Detail |
|---|---|
| **Type** | Trigger function |
| **Returns** | `TRIGGER` |
| **Language** | PL/pgSQL |

**What it does:**
Sets `NEW.updated_at` to the current timestamp (`NOW()`) before any `UPDATE` is committed. It is a shared helper — the same function backs all four `updated_at` triggers, so there is no duplicated logic.

**Why it exists:**
The Flask backend only manually set `updated_at` on the `lead` table. This function makes timestamp maintenance universal and consistent across all key tables without requiring application-level code.

---

### `fn_log_status_change`

| Property | Detail |
|---|---|
| **Type** | Trigger function |
| **Returns** | `TRIGGER` |
| **Language** | PL/pgSQL |

**What it does:**
After any `UPDATE` on the `application` table, checks whether `app_status` actually changed. If it did, inserts a row into `application_status_log` capturing the old value, the new value, and the timestamp. No-op if the status is unchanged.

**Why it exists:**
NBFC regulatory requirements demand a full audit trail of every status transition (e.g., `Under Review` → `Approved` → `Disbursed`). This moves that responsibility from the application layer into the database, making it tamper-resistant.

---

### `fn_calculate_emi`

| Property | Detail |
|---|---|
| **Type** | Scalar function |
| **Returns** | `FLOAT` |
| **Language** | PL/pgSQL |
| **Volatility** | `IMMUTABLE` (safe to index/cache) |

**Signature:**
```sql
fn_calculate_emi(p_loan_amount FLOAT, p_annual_roi FLOAT, p_tenure_months INT)
```

**What it does:**
Computes the monthly EMI using the standard compound-interest formula:

```
EMI = P × r × (1 + r)ⁿ / ((1 + r)ⁿ − 1)
```

where `r = annual_roi / 1200` and `n = tenure_months`. Handles edge cases:
- Returns `0` if loan amount or tenure is ≤ 0.
- Falls back to simple division (`P / n`) for zero-interest loans.
- Result is rounded to 2 decimal places.

**Why it exists:**
The ML risk model in `train_model.py` approximates EMI as `loan_amount / tenure`, which significantly inflates the `emi_to_income` ratio at higher interest rates. This function provides a precise value usable anywhere — in queries, reports, and procedures.

**Example:**
```sql
SELECT fn_calculate_emi(500000, 12.5, 36);
-- → 16607.00  (₹5L loan, 12.5% p.a., 36 months)
```

---

### `fn_get_portfolio_summary`

| Property | Detail |
|---|---|
| **Type** | Set-returning function |
| **Returns** | `TABLE` (single row) |
| **Language** | PL/pgSQL |

**Signature:**
```sql
SELECT * FROM fn_get_portfolio_summary();
```

**What it does:**
Returns a single aggregated row with the following columns:

| Column | Description |
|---|---|
| `total_leads` | Total rows in the `lead` table |
| `total_applications` | Total rows in `application` |
| `pending_assessment` | Applications with no risk label or `'pending'` |
| `approved` | Count where `app_status = 'Approved'` |
| `rejected` | Count where `app_status = 'Rejected'` |
| `disbursed` | Count where `app_status = 'Disbursed'` |
| `low_risk` | Count where `risk_label = 'Low Risk'` |
| `high_risk` | Count where `risk_label = 'High Risk'` |
| `total_loan_value` | Sum of all `loan_amount` values |
| `avg_loan_amount` | Average loan amount, rounded to 2 dp |
| `avg_risk_score` | Average risk score, rounded to 4 dp |

**Why it exists:**
The `/api/stats` Flask endpoint currently fetches every row from both tables and counts in Python memory. This function collapses all of that into a single aggregated SQL query, dramatically reducing data transfer and processing time for the dashboard.

---

## Triggers

### `trg_lead_updated_at`

| Property | Detail |
|---|---|
| **Table** | `lead` |
| **Event** | `BEFORE UPDATE` |
| **Scope** | `FOR EACH ROW` |
| **Function** | `fn_set_updated_at()` |

Automatically refreshes the `updated_at` column on the `lead` table before every update commits.

---

### `trg_applicant_updated_at`

| Property | Detail |
|---|---|
| **Table** | `applicant` |
| **Event** | `BEFORE UPDATE` |
| **Scope** | `FOR EACH ROW` |
| **Function** | `fn_set_updated_at()` |

Automatically refreshes the `updated_at` column on the `applicant` table before every update commits.

---

### `trg_application_updated_at`

| Property | Detail |
|---|---|
| **Table** | `application` |
| **Event** | `BEFORE UPDATE` |
| **Scope** | `FOR EACH ROW` |
| **Function** | `fn_set_updated_at()` |

Automatically refreshes the `updated_at` column on the `application` table before every update commits.

---

### `trg_document_updated_at`

| Property | Detail |
|---|---|
| **Table** | `document` |
| **Event** | `BEFORE UPDATE` |
| **Scope** | `FOR EACH ROW` |
| **Function** | `fn_set_updated_at()` |

Automatically refreshes the `updated_at` column on the `document` table before every update commits.

---

### `trg_application_status_audit`

| Property | Detail |
|---|---|
| **Table** | `application` |
| **Event** | `AFTER UPDATE` |
| **Scope** | `FOR EACH ROW` |
| **Function** | `fn_log_status_change()` |

Fires after every update on `application`. If `app_status` changed, writes a record to `application_status_log`. This trigger fires automatically — even when `sp_approve_and_disburse` changes the status — ensuring the audit trail is always complete.

---

## Procedures

### `sp_approve_and_disburse`

| Property | Detail |
|---|---|
| **Type** | Stored Procedure |
| **Language** | PL/pgSQL |
| **Transactional** | Yes — entire body is atomic |

**Signature:**
```sql
CALL sp_approve_and_disburse(
  p_application_id  INT,
  p_disburse_amount NUMERIC,
  p_actor           TEXT DEFAULT 'system'
);
```

**What it does:**
Atomically transitions an application from `Approved` to `Disbursed` in a single database transaction. Runs through a sequence of validation gates before writing anything, and raises a descriptive exception at the first failure.

**Execution steps (in order):**

| Step | Action |
|---|---|
| 1 | Acquires a `FOR UPDATE` row lock to prevent concurrent disbursements on the same application |
| 2 | **Status gate** — raises if `app_status ≠ 'Approved'` |
| 3 | **Risk gate** — raises if `risk_label = 'High Risk'` |
| 4 | **Amount checks** — raises if amount ≤ 0, exceeds sanctioned `loan_amount`, or exceeds the ₹1 Cr hard ceiling |
| 5 | Calls `fn_calculate_emi()` to compute the precise compound-interest monthly EMI |
| 6 | Updates `application` — sets `app_status = 'Disbursed'` and locks in the actual disbursed `loan_amount` |
| 7 | Inserts a row into `disbursement_log` with the amount, EMI, actor, and timestamp |

> **Note:** Because `trg_application_status_audit` is attached to `application`, step 6 automatically writes to `application_status_log` as well — no extra code needed.

**Error messages:**

| Condition | Exception message |
|---|---|
| Application not found | `Application {id} not found` |
| Wrong status | `Cannot disburse application {id}: current status is '{status}', expected 'Approved'` |
| High risk | `Cannot disburse application {id}: flagged as High Risk (score: {score})` |
| Amount ≤ 0 | `Disbursement amount must be positive (got {amount})` |
| Amount > sanctioned | `Disbursement amount {x} exceeds sanctioned loan amount {y}` |
| Amount > ceiling | `Disbursement amount {x} exceeds the hard ceiling of {ceiling}` |

**Example:**
```sql
CALL sp_approve_and_disburse(42, 2000000, 'ops-user');
-- NOTICE: Application 42 successfully disbursed. Amount: 2000000, EMI: 44560.98, Actor: ops-user
```

---

## Supporting Tables

### `application_status_log`

Created by the triggers script. Populated automatically by `trg_application_status_audit`.

| Column | Type | Description |
|---|---|---|
| `log_id` | `SERIAL PK` | Auto-incremented row ID |
| `application_id` | `INT FK` | References `application.application_id` |
| `old_status` | `TEXT` | Status before the change |
| `new_status` | `TEXT` | Status after the change |
| `changed_at` | `TIMESTAMPTZ` | Timestamp of the change (default: `NOW()`) |
| `changed_by` | `TEXT` | Actor identifier (default: `'system'`) |

---

### `disbursement_log`

Created by the triggers script. Populated by `sp_approve_and_disburse`.

| Column | Type | Description |
|---|---|---|
| `disbursement_id` | `SERIAL PK` | Auto-incremented row ID |
| `application_id` | `INT FK` | References `application.application_id` |
| `disbursed_amount` | `NUMERIC` | Actual amount released |
| `emi_amount` | `NUMERIC` | Computed monthly EMI at disbursement time |
| `disbursed_at` | `TIMESTAMPTZ` | Timestamp of disbursement (default: `NOW()`) |
| `disbursed_by` | `TEXT` | Actor who triggered the disbursement |
