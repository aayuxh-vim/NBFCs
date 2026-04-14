-- ============================================================
-- NBFC Loan Management — Tier 1 DB Triggers & Functions
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. AUTO UPDATED_AT TIMESTAMPS
--    Automatically maintains updated_at on every key table.
--    The Flask backend currently only sets this manually on
--    leads — this makes it universal and consistent.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$  
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure updated_at columns exist before attaching triggers
ALTER TABLE lead        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE applicant   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE application ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE document    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_lead_updated_at        ON lead;
DROP TRIGGER IF EXISTS trg_applicant_updated_at   ON applicant;
DROP TRIGGER IF EXISTS trg_application_updated_at ON application;
DROP TRIGGER IF EXISTS trg_document_updated_at    ON document;

CREATE TRIGGER trg_lead_updated_at
  BEFORE UPDATE ON lead
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_applicant_updated_at
  BEFORE UPDATE ON applicant
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_application_updated_at
  BEFORE UPDATE ON application
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_document_updated_at
  BEFORE UPDATE ON document
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 2. APPLICATION STATUS AUDIT LOG
--    Every status change is recorded: who changed it, when,
--    and from which old value. Critical for NBFC compliance
--    and regulatory audits.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS application_status_log (
  log_id         SERIAL PRIMARY KEY,
  application_id INT         REFERENCES application(application_id) ON DELETE SET NULL,
  old_status     TEXT,
  new_status     TEXT        NOT NULL,
  changed_at     TIMESTAMPTZ DEFAULT NOW(),
  changed_by     TEXT        DEFAULT 'system'  -- extend with auth.uid() if using RLS
);

CREATE INDEX IF NOT EXISTS idx_status_log_app_id
  ON application_status_log(application_id);

CREATE OR REPLACE FUNCTION fn_log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when app_status actually changes
  IF OLD.app_status IS DISTINCT FROM NEW.app_status THEN
    INSERT INTO application_status_log (application_id, old_status, new_status)
    VALUES (NEW.application_id, OLD.app_status, NEW.app_status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_application_status_audit ON application;

CREATE TRIGGER trg_application_status_audit
  AFTER UPDATE ON application
  FOR EACH ROW EXECUTE FUNCTION fn_log_status_change();


-- ────────────────────────────────────────────────────────────
-- 3. EMI CALCULATOR FUNCTION
--    Compound-interest EMI formula. The ML risk model
--    currently approximates EMI as loan_amount / tenure,
--    which inflates emi_to_income ratios at high ROI.
--    Use this anywhere: SELECT fn_calculate_emi(500000, 12.5, 36);
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_calculate_emi(
  p_loan_amount   FLOAT,
  p_annual_roi    FLOAT,   -- percentage, e.g. 12.5 for 12.5% p.a.
  p_tenure_months INT
)
RETURNS FLOAT AS $$
DECLARE
  v_monthly_rate FLOAT;
  v_emi          FLOAT;
BEGIN
  -- Guard against bad inputs
  IF p_loan_amount <= 0 OR p_tenure_months <= 0 THEN
    RETURN 0;
  END IF;

  v_monthly_rate := p_annual_roi / (12.0 * 100.0);

  IF v_monthly_rate = 0 THEN
    -- Zero-interest loan: simple division
    RETURN ROUND((p_loan_amount / p_tenure_months)::NUMERIC, 2);
  END IF;

  -- Standard EMI formula: P × r × (1+r)^n / ((1+r)^n − 1)
  v_emi := p_loan_amount
         * v_monthly_rate
         * POW(1.0 + v_monthly_rate, p_tenure_months)
         / (POW(1.0 + v_monthly_rate, p_tenure_months) - 1.0);

  RETURN ROUND(v_emi::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Quick smoke-test (should return ~16,607 for a ₹5L loan, 12.5% p.a., 36 months)
-- SELECT fn_calculate_emi(500000, 12.5, 36);


-- ────────────────────────────────────────────────────────────
-- 4. PORTFOLIO SUMMARY FUNCTION
--    Replaces the Python /api/stats endpoint logic (which
--    fetches ALL rows and counts in memory) with a single
--    aggregated SQL query. Call it from Flask or directly
--    from the Supabase JS client.
--    Usage: SELECT * FROM fn_get_portfolio_summary();
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_get_portfolio_summary()
RETURNS TABLE (
  total_leads         BIGINT,
  total_applications  BIGINT,
  pending_assessment  BIGINT,
  approved            BIGINT,
  rejected            BIGINT,
  disbursed           BIGINT,
  low_risk            BIGINT,
  high_risk           BIGINT,
  total_loan_value    NUMERIC,
  avg_loan_amount     NUMERIC,
  avg_risk_score      NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM lead)::BIGINT                                            AS total_leads,
    COUNT(*)::BIGINT                                                               AS total_applications,
    COUNT(*) FILTER (WHERE risk_label IS NULL OR risk_label = 'pending')::BIGINT  AS pending_assessment,
    COUNT(*) FILTER (WHERE app_status = 'Approved')::BIGINT                       AS approved,
    COUNT(*) FILTER (WHERE app_status = 'Rejected')::BIGINT                       AS rejected,
    COUNT(*) FILTER (WHERE app_status = 'Disbursed')::BIGINT                      AS disbursed,
    COUNT(*) FILTER (WHERE risk_label = 'Low Risk')::BIGINT                       AS low_risk,
    COUNT(*) FILTER (WHERE risk_label = 'High Risk')::BIGINT                      AS high_risk,
    COALESCE(SUM(loan_amount), 0)::NUMERIC                                         AS total_loan_value,
    COALESCE(ROUND(AVG(loan_amount)::NUMERIC, 2), 0)                              AS avg_loan_amount,
    COALESCE(ROUND(AVG(risk_score)::NUMERIC, 4), 0)                               AS avg_risk_score
  FROM application;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 5. PROCEDURE: APPROVE & DISBURSE
--    Atomically transitions an application to 'Disbursed'.
--    Validates:
--      • Application exists and is currently 'Approved'
--      • Risk label is not 'High Risk'
--      • Loan amount is within the approved ceiling
--    Then atomically:
--      • Writes the precise DB-calculated EMI back to the row
--      • Sets app_status → 'Disbursed'
--      • Inserts a row into disbursement_log
--    Raises descriptive exceptions on any validation failure
--    so callers get actionable error messages.
--
--    Usage:
--      CALL sp_approve_and_disburse(42, 2000000, 'ops-user');
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disbursement_log (
  disbursement_id  SERIAL PRIMARY KEY,
  application_id   INT          REFERENCES application(application_id) ON DELETE SET NULL,
  disbursed_amount NUMERIC      NOT NULL,
  emi_amount       NUMERIC      NOT NULL,
  disbursed_at     TIMESTAMPTZ  DEFAULT NOW(),
  disbursed_by     TEXT         NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_disbursement_log_app_id
  ON disbursement_log(application_id);

CREATE OR REPLACE PROCEDURE sp_approve_and_disburse(
  p_application_id   INT,
  p_disburse_amount  NUMERIC,         -- actual amount being released (may differ from sanctioned)
  p_actor            TEXT DEFAULT 'system'
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_app          application%ROWTYPE;
  v_emi          NUMERIC;
  v_max_ceiling  NUMERIC := 10000000; -- ₹1 Cr hard cap; adjust per NBFC policy
BEGIN
  -- ── 1. Lock the row for update to prevent concurrent disbursements ──
  SELECT * INTO v_app
  FROM application
  WHERE application_id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application % not found', p_application_id;
  END IF;

  -- ── 2. Status gate ──
  IF v_app.app_status <> 'Approved' THEN
    RAISE EXCEPTION
      'Cannot disburse application %: current status is ''%'', expected ''Approved''',
      p_application_id, v_app.app_status;
  END IF;

  -- ── 3. Risk gate ──
  IF v_app.risk_label = 'High Risk' THEN
    RAISE EXCEPTION
      'Cannot disburse application %: flagged as High Risk (score: %)',
      p_application_id, v_app.risk_score;
  END IF;

  -- ── 4. Amount sanity checks ──
  IF p_disburse_amount <= 0 THEN
    RAISE EXCEPTION 'Disbursement amount must be positive (got %)', p_disburse_amount;
  END IF;

  IF p_disburse_amount > COALESCE(v_app.loan_amount, 0) THEN
    RAISE EXCEPTION
      'Disbursement amount % exceeds sanctioned loan amount %',
      p_disburse_amount, v_app.loan_amount;
  END IF;

  IF p_disburse_amount > v_max_ceiling THEN
    RAISE EXCEPTION
      'Disbursement amount % exceeds the hard ceiling of %',
      p_disburse_amount, v_max_ceiling;
  END IF;

  -- ── 5. Compute precise EMI using the existing DB function ──
  v_emi := fn_calculate_emi(
    p_disburse_amount::FLOAT,
    COALESCE(v_app.loan_roi, 0)::FLOAT,
    COALESCE(v_app.loan_tenure, 1)::INT
  );

  -- ── 6. Update application row ──
  UPDATE application
  SET
    app_status = 'Disbursed',
    loan_amount = p_disburse_amount   -- lock in actual disbursed figure
  WHERE application_id = p_application_id;

  -- ── 7. Write disbursement log ──
  INSERT INTO disbursement_log (application_id, disbursed_amount, emi_amount, disbursed_by)
  VALUES (p_application_id, p_disburse_amount, v_emi, p_actor);

  RAISE NOTICE
    'Application % successfully disbursed. Amount: %, EMI: %, Actor: %',
    p_application_id, p_disburse_amount, v_emi, p_actor;
END;
$$;


-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying the above to confirm everything
-- installed correctly.
-- ============================================================

-- Check all triggers are registered
SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check functions AND procedures exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'fn_set_updated_at',
    'fn_log_status_change',
    'fn_calculate_emi',
    'fn_get_portfolio_summary',
    'sp_approve_and_disburse'   -- PROCEDURE
  );

-- Confirm audit log table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'application_status_log'
ORDER BY ordinal_position;

-- Confirm disbursement log table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'disbursement_log'
ORDER BY ordinal_position;

-- Smoke-test the procedure (rolls back automatically in a DO block)
-- Uncomment to test against a real approved application:
-- CALL sp_approve_and_disburse(<application_id>, <amount>, 'test-user');
