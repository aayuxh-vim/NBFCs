-- NBFC Loan Management — Database Migration
-- Run this in Supabase Dashboard → SQL Editor

-- Add risk assessment columns to application table
ALTER TABLE application ADD COLUMN IF NOT EXISTS risk_score float;
ALTER TABLE application ADD COLUMN IF NOT EXISTS risk_label text DEFAULT 'pending';
ALTER TABLE application ADD COLUMN IF NOT EXISTS app_status text DEFAULT 'New';

-- Document table for uploaded files
CREATE TABLE IF NOT EXISTS document (
  document_id serial PRIMARY KEY,
  application_id int REFERENCES application(application_id),
  applicant_id int REFERENCES applicant(applicant_id),
  doc_type text NOT NULL,
  file_url text NOT NULL,
  ocr_text text,
  ocr_verified boolean DEFAULT false,
  uploaded_at timestamptz DEFAULT now()
);
