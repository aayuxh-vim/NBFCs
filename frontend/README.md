# Frontend (Next.js)

## Setup

```bash
copy .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

- `NEXT_PUBLIC_API_BASE_URL` (Flask, e.g. `http://localhost:5001`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Auth

Login page: `/login` (Supabase Auth email/password).
