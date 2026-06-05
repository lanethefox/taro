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

Blog, decisions, catalog, ERD, and search render as placeholders that get built
out in M1 (remaining slices) – M3.

## Status — Milestone M1 (Knowledge core) ✅

- [x] TipTap block editor (headings, lists, code blocks, quotes) with a toolbar
- [x] Custom **`[[wikilink]]`** extension — typing `[[Title]]` creates a link
      token; on save the server resolves titles to pages and writes `links` rows
      (red links auto-create stub pages so the graph stays connected)
- [x] Pages: tree (via `parent_id`) + create / edit / delete, slugged routes,
      reader + inline editor, visibility control
- [x] **Backlinks panel** ("referenced by") on every page — spans pages *and* posts
- [x] **Posts** (blog) + **decision records** (ADRs with context / decision /
      consequences / status + `supersedes`), draft/published, same editor
- [x] **Tags** on pages and posts + tag index and per-tag pages
- [x] Global **search** — Postgres full-text (ranked) + trigram fuzzy on titles
- [x] **LinkedIn export** — post → clean Markdown / plain text (route + copy menu)
- [x] Strategy-library Concept pages seeded (M0)

## Case Studies (interactive, gamified)

A practice surface where the theory in Concept pages gets built end-to-end.
Each **case study** (ClassDojo is the first scenario) seeds a gap-free
**curriculum** — 9 technical + 8 business/stakeholder tasks — and every task is
an **editor workspace** that links back to the relevant Concept pages (so those
pages show the case-study tasks in their backlinks). Completion is tracked with
cozy progress rings and "tiles filling in"; finishing the baseline unlocks a
**Room for improvement** log. Styled after *Dorfromantik* — warm parchment,
sage/terracotta/wheat, tactile tiles.

> Adds tables `case_studies` + `case_study_tasks` (migration
> `drizzle/0001_case_studies.sql`) and `node_type` gains `case_study` / `task`.
> Apply that migration + `supabase/policies_case_studies.sql` on existing DBs.

Next: **M2 — Catalog** (models / sources / columns / tests, lineage graph,
observation metadata).

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

## Deploying

A full step-by-step for a free-tier Vercel + Supabase deploy lives in
[`docs/DEPLOY.md`](docs/DEPLOY.md) — Supabase project + schema, Google/GitHub
OAuth, Vercel import, env vars, and post-deploy auth wiring.

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
