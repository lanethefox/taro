# taro

A personal, portable knowledge platform for analytics engineering — a reference
**wiki**, a **blog + decision log**, an **ERD designer**, and a **data catalog**,
unified as one linked knowledge graph.

Every meaningful object (page, post, model, column, diagram, tag) is a **node**;
any node can link to any node, with bidirectional backlinks. That graph is what
makes taro more than four separate tools.

> Full detail: [`docs/SPEC.md`](docs/SPEC.md) ·
> one-pager: [`docs/SPEC-SHEET.md`](docs/SPEC-SHEET.md) ·
> build order: [`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md)

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js (App Router, TypeScript) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Data | Supabase Postgres |
| ORM / migrations | Drizzle ORM (SQL-first, checked into `drizzle/`) |
| Auth | Supabase Auth — Google + GitHub OAuth + Row-Level Security |
| Storage | Supabase Storage |
| Editor | TipTap (content stored as JSON in Postgres) |
| Canvas | React Flow (ERD + lineage) |
| Hosting | Vercel |

## Status — Milestone M0 (Foundation)

- [x] Next.js app, Tailwind, shadcn, app shell (sidebar + topbar)
- [x] Supabase `@supabase/ssr` server/client/middleware helpers
- [x] Full Drizzle schema for the §5 data model + first migration (`drizzle/`)
- [x] Google + GitHub OAuth, session in middleware, `profiles` provisioned on
      first sign-in (first user = owner, others = viewer)
- [x] RLS policies for owner / viewer / public (`supabase/policies.sql`)
- [x] Strategy-library Concept page seed (`supabase/seed.sql`)

Surfaces (wiki, blog, decisions, catalog, ERD, search) render as placeholders
that get built out in M1–M3.

## Getting started

### 1. Prerequisites (one-time, free)

Create a **Supabase** project and configure OAuth:

1. **Google OAuth client** and a **GitHub OAuth app**, both with the callback
   `https://<your-ref>.supabase.co/auth/v1/callback`.
2. In **Supabase → Authentication → Providers**, enable Google + GitHub and
   paste the client IDs/secrets.

### 2. Environment

```bash
cp .env.example .env.local   # fill in Supabase URL, anon key, service-role key, DATABASE_URL
pnpm install
```

### 3. Database

Apply the migration, RLS policies, and seed (needs `DATABASE_URL` + `psql`):

```bash
pnpm db:migrate                       # apply drizzle/ migrations
psql "$DATABASE_URL" -f supabase/policies.sql
psql "$DATABASE_URL" -f supabase/seed.sql
# or all three at once:
pnpm db:setup
```

No direct Postgres access? Paste `drizzle/0000_init.sql`, then
`supabase/policies.sql`, then `supabase/seed.sql` into the Supabase SQL editor.

### 4. Run

```bash
pnpm dev   # http://localhost:3000
```

The first account to sign in becomes the **owner**. Everyone else joins as a
**viewer**.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript |
| `pnpm db:generate` | Generate a migration from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Push schema directly (dev) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:setup` | Migrate + policies + seed |

## Layout

```
src/
  app/
    (auth)/login/            OAuth sign-in
    (app)/                   authed shell: wiki · blog · decisions · catalog · erd · search
    auth/callback/           OAuth callback + profile provisioning
  db/                        Drizzle schema + client
  lib/
    auth.ts                  session/role helpers
    supabase/                ssr server/client/middleware/admin clients
  components/
    shell/                   sidebar, topbar, nav
    ui/                      shadcn components
drizzle/                     generated SQL migrations (checked in)
supabase/                    RLS policies + seed
docs/                        spec set
```
