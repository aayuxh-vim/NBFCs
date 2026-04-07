# NBFCs (Flask + Next.js + Supabase)

This repo contains:

- `backend/`: Flask REST API that talks to Supabase Postgres
- `frontend/`: Next.js UI that calls the Flask API

## Prerequisites

- Python 3.10+
- Node.js 18+

## Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
python app.py
```

Backend default: `http://localhost:5001`

## Frontend (Next.js)

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Frontend default: `http://localhost:3000`

## Environment variables

- **Backend**: set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`
- **Frontend**: set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` (points to Flask)
  - Also set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for login

## What’s implemented

- Leads:
  - list/search
  - create
  - view details + linked applicants
  - delete

- Auth:
  - Login page at `/login` (Supabase Auth email/password)
  - API calls send `Authorization: Bearer <access_token>`
  - Flask requires auth for `/api/*` (except `/api/health`)

