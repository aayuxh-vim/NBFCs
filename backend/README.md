# Backend (Flask)

## Setup

Create a virtualenv, install deps, then run:

```bash
pip install -r requirements.txt
copy .env.example .env
python app.py
```

The API runs on `http://localhost:5001` by default.

## Environment

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (backend-only)

## Auth

All `/api/*` routes require a Supabase Auth **access token** via:

`Authorization: Bearer <access_token>`

Exception: `GET /api/health` is public.
