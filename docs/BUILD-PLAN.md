# taro — Design & Build Plan

A self-contained plan to stand up taro from scratch in a new environment. Pair it
with `docs/SPEC.md` (full spec) and `docs/SPEC-SHEET.md` (one-page summary). No
prior container state is required — everything needed is here.

---

## 0. Accounts & prerequisites (one-time, free)

Create these before coding:

1. **Supabase** project (free tier) — gives Postgres + Auth + Storage.
   - Note the **Project URL**, **anon key**, **service-role key**, and the
     **Postgres connection string** (Settings → Database).
2. **Vercel** account (free Hobby) — for deploy. Connect it to the GitHub repo.
3. **Google OAuth** client — Google Cloud Console → APIs & Services →
   Credentials → OAuth client ID (type: Web). Authorized redirect URI:
   `https://<your-supabase-ref>.supabase.co/auth/v1/callback`.
   Capture **Client ID** + **Client Secret**.
4. **GitHub OAuth app** — GitHub → Settings → Developer settings → OAuth Apps.
   Authorization callback URL: same Supabase callback as above. Capture
   **Client ID** + **Client Secret**.
5. In **Supabase → Authentication → Providers**, enable **Google** and **GitHub**
   and paste the client IDs/secrets from steps 3–4.

Local tooling: Node 20+, pnpm (or npm), the Supabase CLI (optional, for local
migrations), and the Drizzle Kit CLI (via dev dependency).

---

## 1. Repo bootstrap

```bash
# in the empty taro repo
pnpm create next-app@latest . \
  --typescript --app --tailwind --eslint --src-dir --import-alias "@/*"

# core deps
pnpm add drizzle-orm postgres @supabase/supabase-js @supabase/ssr zod
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/pm reactflow
pnpm add @tanstack/react-query lucide-react
pnpm add class-variance-authority clsx tailwind-merge

# dev deps
pnpm add -D drizzle-kit @types/pg

# shadcn/ui
pnpm dlx shadcn@latest init
```

### Environment variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # server-only, never exposed to client
DATABASE_URL=postgres://...            # Supabase pooler connection string
```
Add the same to Vercel project settings before deploy. Commit a `.env.example`
with the keys (no values).

---

## 2. Target directory structure

```
src/
  app/
    (auth)/login/                 # OAuth sign-in
    (app)/                        # authed shell: sidebar nav + topbar
      wiki/[...slug]/             # page tree + reader/editor
      blog/                       # posts list + post view
      decisions/                  # decision records
      catalog/                    # models / sources / columns
      catalog/lineage/            # lineage graph
      erd/[diagramId]/            # ERD canvas
      search/                     # global search results
    api/
      export/post/[id]/route.ts   # markdown/LinkedIn export
      export/erd/[id]/route.ts    # DBML/SQL/dbt/PNG export
  db/
    schema.ts                     # Drizzle schema (full data model)
    index.ts                      # db client
    queries/                      # typed query helpers
  components/
    editor/                       # TipTap + wikilink extension
    graph/                        # shared React Flow node/edge components
    ui/                           # shadcn components
  lib/
    auth.ts                       # Supabase server/client helpers
    links.ts                      # backlink graph read/write
    search.ts                     # FTS helpers
drizzle/                          # generated migrations (checked in)
docs/                             # this spec set
supabase/                         # RLS policies, seed.sql
```

---

## 3. Data model → migrations

Define the full schema from `SPEC.md` §5 in `src/db/schema.ts` (Drizzle), then:

```bash
pnpm drizzle-kit generate   # emits SQL migration into /drizzle
pnpm drizzle-kit migrate    # applies to Supabase Postgres
```

Key points:
- `content` columns are `jsonb` (TipTap doc JSON).
- `links` is polymorphic (`source_type/source_id/target_type/target_id`) — the
  graph glue; index both directions.
- `search_tsv` are generated `tsvector` columns with GIN indexes; enable
  `pg_trgm` for fuzzy search.
- Shared `relationships` table backs both catalog FKs and ERD edges; diagrams
  store only layout.

### Row-Level Security (Supabase, `supabase/policies.sql`)
- Default deny.
- `owner` role: full CRUD on all tables.
- `viewer`: `SELECT` where `visibility <> 'private'`.
- anon/public: `SELECT` only where `visibility = 'public'` (posts).
- Role comes from `profiles.role`, keyed to `auth.uid()`.

---

## 4. Milestones (build order)

Each milestone leaves taro usable. Treat the checklists as the task backlog.

### M0 — Foundation
- [ ] Bootstrap Next.js app, Tailwind, shadcn, base layout/nav shell.
- [ ] Supabase project wired; `@supabase/ssr` server+client helpers.
- [ ] Full Drizzle schema + first migration applied.
- [ ] Supabase Auth: Google + GitHub login, session in middleware, `profiles`
      row on first sign-in (owner = you, others = viewer).
- [ ] RLS policies in place and tested for all three roles.

### M1 — Knowledge core
- [ ] TipTap editor component (headings, lists, code+SQL blocks, tables,
      callouts, images via Supabase Storage).
- [ ] Custom **wikilink** extension: `[[Title]]` resolves to a node and writes
      `links` rows on save.
- [ ] Pages: tree (parent_id) + CRUD + reader/editor + backlinks panel.
- [ ] Posts: blog + decision records (with `decision_meta` + `supersedes`).
- [ ] Tags + tag pages; global FTS search + trigram fuzzy.
- [ ] **LinkedIn export** route (post → clean markdown/plain text).
- [ ] Seed the strategy library (Concept pages) from `supabase/seed.sql`.

### M2 — Catalog
> Re-planned around `DESIGN-PRINCIPLES.md`: a node carries its *meaning*
> (definition + grain), not just its structure; rationale travels with structure.
- [x] Models / sources / columns CRUD with all metadata fields.
- [x] Inline column tests; PK/FK flags; observation metadata.
- [x] Concept ↔ catalog linking (a node's "Related concepts"; concept backlinks
      list the models/sources that use them — both directions).
- [ ] **Grain & definition first-class** — grain on *sources* too; lead reader
      views with name → definition → grain → structure → links (Principles 1, 3).
- [ ] **Capture the why** — decision records link to catalog/concept nodes; a
      model shows the decisions that shaped it (Principle 4).
- [x] `model_dependencies` → **lineage graph** (React Flow), upstream/downstream
      navigation (the "how-it-connects" structural layer).

### M2.5 — Semantic layer (new)
> Where coherence becomes a feature (Principles 2, 5). Pulled forward from polish.
- [x] **"How taro thinks"** explainer page (`/about`).
- [x] **Glossary** surface (`/glossary`): concepts as canonical definitions, each
      with a *used by* count (graph-wide backlinks).
- [x] Catalog nodes (models / sources / columns) + concept definitions are
      **searchable** (trigram/ILIKE added beyond pages/posts FTS).
- [~] Coherence nudges: near-duplicate concept flag on the glossary
      (`src/lib/coherence.ts`) done; the editor "offer to link a term" nudge is a
      follow-up.

### M3 — ERD designer
- [x] React Flow canvas; table nodes render columns + keys from catalog models.
- [x] `relationships` with cardinality (1:1/1:N/N:N) + join columns as edges.
      (Drawn column→column; cardinality defaults to 1:N — an inline per-edge
      cardinality switcher is a small follow-up.)
- [x] Per-diagram layout persistence (`diagram_nodes` positions/sizes).
- [x] Edits on canvas write through to catalog (single source of truth).
- [~] Exports: **DBML**, **SQL DDL**, **dbt `schema.yml`** done; PNG/SVG pending
      (needs a render dep — deferred).

### M4 — Polish & demo
- [x] Command-palette global search/navigation (⌘K) over the whole graph
      (search results + nav destinations).
- [x] **Machine-readable context bundle** — definitions + grain + structure +
      relationships as JSON at `/api/context` (Principle 5, north star).
- [ ] `revisions` history for pages/posts. (Needs a `revisions` table +
      migration — not yet done.)
- [ ] Per-post public sharing (visibility flag + unauth render). (Needs an
      unauthed route / proxy allowance — not yet done.)
- [x] Light/dark theme (toggle in the topbar; pre-paint no-flash script).
- [x] Deployed to Vercel. (NB: production auto-deploy from the prod branch is
      currently not firing — a Vercel dashboard setting; building is unaffected.)

---

## 5. Definition of done (per surface)

- **Wiki**: create/edit/link pages; backlinks resolve; search finds content.
- **Blog/Decisions**: publish a post; export it cleanly for LinkedIn; record and
  supersede a decision.
- **Catalog**: define a model with columns/tests; see its lineage; link it to a
  concept.
- **ERD**: draw a diagram from catalog models; export valid DBML/SQL/dbt.
- **Auth**: only authed users read; only owner writes; public posts readable
  signed-out.

---

## 6. Kickoff prompt for the new environment

Paste this into the first Claude session in the new env (with `lanethefox/taro`
in scope):

> Read `docs/SPEC.md`, `docs/SPEC-SHEET.md`, and `docs/BUILD-PLAN.md` in this
> repo. They fully specify taro — a personal analytics-engineering knowledge
> platform (wiki + blog/decision log + ERD designer + data catalog) on Next.js 15
> + Supabase + Drizzle + TipTap + React Flow. Start with milestone **M0** from the
> build plan: bootstrap the Next.js app, wire Supabase, define the full Drizzle
> schema from SPEC §5 with a first migration, and implement Google + GitHub OAuth
> with RLS for owner/viewer/public roles. Keep migrations checked into `/drizzle`.
> Confirm the plan, then build M0 and open a draft PR.

---

## 7. Notes for the move

- This repo currently holds only docs + an initial commit. Bring the whole repo
  (or just `docs/`) into the new env.
- Make sure the new environment's **repo scope includes `lanethefox/taro`** so the
  agent can push and open PRs.
- Network policy in the new env must allow Supabase + npm registry egress for
  `M0` setup.
