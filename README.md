# NBFC Loan Management System

AI-powered loan origination, risk assessment, and application management system for Non-Banking Financial Companies.

---

## Overview

This system digitises the complete loan lifecycle — from lead capture to automated risk scoring. It replaces manual Excel-based workflows with a structured database, multi-step digital application forms, and a machine learning model that predicts applicant creditworthiness.

### Core Workflow

1. **Lead Capture** — Staff or customers create leads via a digital form
2. **Application Submission** — Multi-step wizard collects personal, financial, and KYC data
3. **Document Processing** — PDFs are uploaded and text is extracted automatically via OCR
4. **AI Risk Assessment** — A Random Forest classifier scores each application (High Risk / Low Risk)
5. **Admin Dashboard** — NBFC staff review applications in a table or pipeline view, sorted by risk score
6. **Status Management** — Applications move through the pipeline: New → Under Review → Approved → Rejected → Disbursed

---

## Tech Stack

| Component    | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 16, React 19, Tailwind CSS 4 |
| Backend     | Python, Flask, Flask-CORS           |
| Database    | Supabase (PostgreSQL)               |
| Auth        | Supabase Auth (email/password)      |
| AI/ML       | Scikit-learn (Random Forest)        |
| OCR         | pdfplumber (PDF text extraction)    |
| Icons       | Lucide React                        |

---

## Project Structure

```
NBFCs/
├── backend/
│   ├── app.py              # Flask API — all endpoints
│   ├── train_model.py       # ML training script
│   ├── risk_model.pkl       # Trained Random Forest model
│   ├── migration.sql        # SQL migration for Supabase
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables (not committed)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                    # Dashboard home with stats
│   │   │   ├── layout.tsx                  # Root layout with navigation
│   │   │   ├── login/page.tsx              # Supabase Auth login
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx                # Leads list with search
│   │   │   │   ├── new/page.tsx            # Create lead form
│   │   │   │   └── [lead_id]/page.tsx      # Lead detail + applicants
│   │   │   └── applications/
│   │   │       ├── page.tsx                # Admin dashboard (table + pipeline)
│   │   │       ├── new/page.tsx            # Multi-step application wizard
│   │   │       └── [application_id]/page.tsx  # Application detail + risk gauge
│   │   ├── components/
│   │   │   ├── AuthNav.tsx                 # Sign in / sign out nav
│   │   │   └── RequireAuth.tsx             # Auth guard wrapper
│   │   └── lib/
│   │       ├── api.ts                      # API client + TypeScript types
│   │       └── supabaseClient.ts           # Supabase client init
│   ├── package.json
│   └── .env.local            # Environment variables (not committed)
│
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Database Migration

Run the following SQL in **Supabase Dashboard → SQL Editor**:

```sql
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
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=5001
```

Train the ML model (one-time):

```bash
python train_model.py
```

Start the server:

```bash
python app.py
```

Backend runs at `http://localhost:5001`

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Start the dev server:

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## API Endpoints

### Public

| Method | Path            | Description       |
|--------|-----------------|-------------------|
| GET    | `/api/health`   | Health check      |

### Authenticated (Bearer token required)

| Method | Path                                    | Description                              |
|--------|----------------------------------------|------------------------------------------|
| GET    | `/api/leads`                            | List leads (optional `?q=` search)       |
| POST   | `/api/leads`                            | Create a lead                            |
| GET    | `/api/leads/:id`                        | Get lead by ID                           |
| DELETE | `/api/leads/:id`                        | Delete a lead                            |
| GET    | `/api/leads/:id/applicants`             | List applicants for a lead               |
| GET    | `/api/applicants`                       | List all applicants                      |
| POST   | `/api/applicants`                       | Create an applicant                      |
| GET    | `/api/applications`                     | List all applications                    |
| POST   | `/api/applications`                     | Create an application                    |
| GET    | `/api/applications/:id`                 | Get application by ID                    |
| PATCH  | `/api/applications/:id/status`          | Update application status                |
| POST   | `/api/applications/:id/assess`          | Run AI risk assessment on application    |
| POST   | `/api/risk-assess`                      | Standalone risk prediction               |
| POST   | `/api/documents/upload`                 | Upload PDF + OCR extraction              |
| GET    | `/api/documents/:application_id`        | List documents for an application        |
| GET    | `/api/stats`                            | Dashboard summary statistics             |

---

## AI Risk Assessment

The risk engine uses a **Random Forest Classifier** trained on synthetic NBFC loan data.

**Features used:**
- `monthly_income`
- `cibil_score`
- `employment_type` (encoded: salaried, self_employed, business, freelancer, retired)
- `loan_amount`
- `loan_tenure`
- `age`
- `debt_to_income` (derived)
- `emi_to_income` (derived)

**Output:**
- `risk_score` — probability of Low Risk (0.0 to 1.0)
- `risk_label` — "Low Risk" or "High Risk"

**Model performance:** 87% accuracy on held-out test set.

The model can be retrained on real historical data by modifying `train_model.py` and running it again.

---

## Features

### Lead Management
- Create, search, view, and delete leads
- Linked applicant information

### Multi-Step Application Form
- 4-step wizard: Personal Info → Financial Details → Documents → Review
- Client-side validation (age >= 18, CIBIL >= 300, etc.)
- Live AI risk preview before submission

### Document Processing
- PDF upload with automatic text extraction
- OCR verification status badges

### Admin Dashboard
- **Table view** — all applications sorted by risk score
- **Pipeline view** — Kanban-style columns by status
- Inline status updates and AI assessment triggers

### Application Detail
- SVG risk score gauge
- Loan details grid
- Document list with extracted text preview

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                   | Description                     |
|---------------------------|---------------------------------|
| `SUPABASE_URL`            | Your Supabase project URL       |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from Supabase |
| `PORT`                    | Server port (default: 5001)     |

### Frontend (`frontend/.env.local`)

| Variable                       | Description                                |
|-------------------------------|--------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL`    | Flask backend URL (e.g. http://localhost:5001) |
| `NEXT_PUBLIC_SUPABASE_URL`    | Your Supabase project URL                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key from Supabase           |
