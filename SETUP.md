# My Dashboard – Setup Guide

## 1. Create a Neon Postgres database

1. Go to https://neon.tech and create a free account
2. Create a new project
3. Copy the **Connection string** (starts with `postgresql://`)

## 2. Set up Google OAuth (for sign-in + Calendar sync)

1. Go to https://console.cloud.google.com
2. Create a new project (or use an existing one)
3. Enable **Google Calendar API**:
   - APIs & Services → Enable APIs → search "Google Calendar API" → Enable
4. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://your-vercel-app.vercel.app/api/auth/callback/google` (prod)
5. Copy the **Client ID** and **Client Secret**

## 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
DATABASE_URL=postgresql://...your neon connection string...
AUTH_SECRET=...run: openssl rand -base64 32...
AUTH_GOOGLE_ID=...your google client id...
AUTH_GOOGLE_SECRET=...your google client secret...
NEXTAUTH_URL=http://localhost:3000
```

Generate `AUTH_SECRET`: run `openssl rand -base64 32` in your terminal.

## 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000 — sign in with Google.

## 5. Deploy to Vercel

1. Push this repo to GitHub
2. Go to https://vercel.com → New Project → import your repo
3. Add the same environment variables in Vercel project settings:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `NEXTAUTH_URL` → set to your Vercel domain (e.g. `https://my-dashboard-xyz.vercel.app`)
4. Deploy!
5. Update Google OAuth redirect URI to include your Vercel URL

## Notes

- The database table is created automatically on first request
- All data is stored as a single JSON blob per Google account (keyed by email)
- Auto-save triggers 1.5s after any change
- Google Calendar sync reads your primary calendar for the current week
