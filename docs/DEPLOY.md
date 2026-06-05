# Deploying taro (Vercel + Supabase, free tier)

A step-by-step to stand up a live dev instance you can validate. ~15 minutes.
Everything below is free-tier.

There are three things to set up, in order:

1. **Supabase** — Postgres + Auth + Storage (the backend)
2. **OAuth apps** — Google + GitHub sign-in
3. **Vercel** — hosts the Next.js app

---

## 1. Supabase project

1. Create a project at <https://supabase.com/dashboard> (pick a strong DB
   password — you'll need it).
2. Once it's provisioned, collect these (Project Settings):
   - **Project URL** — Settings → API → `Project URL`
     → `NEXT_PUBLIC_SUPABASE_URL`
   - **Public client key** — Settings → API. Either the new
     **publishable key** (`sb_publishable_…`) or the legacy **anon** key.
     → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Secret key** — Settings → API. Either the new **secret key**
     (`sb_secret_…`) or the legacy **service_role** key (secret!).
     → `SUPABASE_SERVICE_ROLE_KEY`
   - **Connection string** — click **Connect** (top bar) → **ORMs** / URI.
     Use the **Transaction pooler** (port `6543`) for the app.
     → `DATABASE_URL`

> taro accepts both the new and legacy key names, so you can set either
> `NEXT_PUBLIC_SUPABASE_ANON_KEY` **or** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
> and either `SUPABASE_SERVICE_ROLE_KEY` **or** `SUPABASE_SECRET_KEY`.

> Ignore Supabase's "Install packages / Add UI components" quickstart — this
> repo already has `@supabase/ssr` wired. You only need the values above.

> Use the **Session pooler / direct** connection (port `5432`) only if you run
> migrations from your laptop (see step 4). The app itself uses the transaction
> pooler.

### Apply the schema, policies, and seed

Easiest path (no local tooling) — **Supabase SQL Editor**:

1. SQL Editor → New query → run **every** file in `drizzle/` in order
   (`0000_init.sql`, then `0001_case_studies.sql`, …).
2. New query → paste [`supabase/policies.sql`](../supabase/policies.sql) → Run.
3. New query → paste [`supabase/seed.sql`](../supabase/seed.sql) → Run.

> **Updating an existing deployment?** When you pull changes that add a
> migration, run the new `drizzle/NNNN_*.sql` file(s) and re-run
> `supabase/policies.sql` (it's idempotent — safe to run again). The
> case-studies feature, for example, needs `drizzle/0001_case_studies.sql`
> plus the policies file (or just `supabase/policies_case_studies.sql`).

Or from your machine (needs `DATABASE_URL` in `.env.local`, using the **direct**
`5432` connection):

```bash
pnpm db:migrate
psql "$DATABASE_URL" -f supabase/policies.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

---

## 2. OAuth apps (Google + GitHub)

Both use the **same Supabase callback URL**:

```
https://<your-ref>.supabase.co/auth/v1/callback
```

(`<your-ref>` is the subdomain of your Project URL.)

**GitHub** — Settings → Developer settings → OAuth Apps → New:
- Homepage URL: your Vercel URL (set after step 3; any placeholder is fine now)
- Authorization callback URL: the Supabase callback above
- Copy the **Client ID** + generate a **Client secret**.

**Google** — Google Cloud Console → APIs & Services → Credentials → Create
OAuth client ID → type **Web application**:
- Authorized redirect URI: the Supabase callback above
- Copy the **Client ID** + **Client secret**.

**Enable them in Supabase** — Authentication → Providers → enable **GitHub** and
**Google**, paste each Client ID + Secret, Save.

---

## 3. Deploy to Vercel

1. Push the branch you want live to **`main`** (the branch you're validating —
   merge the open PR into `main`, or set the production branch in step 4).
2. <https://vercel.com/new> → **Import** the `lanethefox/taro` repo.
   Framework preset auto-detects as **Next.js**; leave build settings default.
3. Before the first deploy, add **Environment Variables** (all four, for
   Production + Preview):

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable (`sb_publishable_…`) or anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | secret (`sb_secret_…`) or service_role key |
   | `DATABASE_URL` | Supabase **transaction pooler** URI (port 6543) |

4. Deploy. Note your URL, e.g. `https://taro-xxxx.vercel.app`.
   - If your repo's default branch isn't `main`, set **Settings → Git →
     Production Branch** to the branch you want live.

---

## 4. Wire the deploy back to Supabase Auth

So Supabase will redirect back to your live app after sign-in:

- Supabase → Authentication → **URL Configuration**:
  - **Site URL**: `https://<your-app>.vercel.app`
  - **Redirect URLs**: add `https://<your-app>.vercel.app/**`
    (and `http://localhost:3000/**` for local dev).

Redeploy isn't needed for this — it takes effect immediately.

---

## 5. First sign-in

Open the app → you'll hit `/login` → sign in with Google or GitHub.

**The first account to sign in becomes the `owner`** (full read/write).
Everyone after is a `viewer`. If you provision the wrong account first, delete
its row from the `profiles` table in Supabase and sign in again.

---

## Troubleshooting

- **Stuck on a redirect loop / always at `/login`** — the Vercel URL isn't in
  Supabase's Redirect URLs (step 4), or the env keys are wrong.
- **`DATABASE_URL is not set` at runtime** — env var missing in Vercel, or set
  only for Preview not Production.
- **DB errors under load / prepared-statement errors** — make sure
  `DATABASE_URL` is the **transaction pooler** (6543), not the direct 5432
  string. The client already sets `prepare: false` for pgbouncer.
- **OAuth "redirect_uri_mismatch"** — the provider's callback must be the
  *Supabase* callback (`…supabase.co/auth/v1/callback`), not your Vercel URL.
- **Migrations fail over the pooler** — run them against the **direct** `5432`
  connection (or just use the SQL Editor).

---

## Local development

```bash
cp .env.example .env.local   # fill in the same four values
pnpm install
pnpm dev                     # http://localhost:3000
```

For local OAuth, add `http://localhost:3000/**` to Supabase Redirect URLs.
