# taro — project state & working memory

> Read this first. It's the cross-session handoff: where the build is, how it's
> deployed, the conventions, and the gotchas. Keep it updated as things change.

## What taro is
A single-owner (multi-viewer) knowledge platform for analytics engineering:
wiki + blog/decision log + **case studies** + (coming) data catalog + ERD, all
one linked knowledge graph. Full spec in `docs/SPEC.md`, build order in
`docs/BUILD-PLAN.md`, deploy steps in `docs/DEPLOY.md`. **Design philosophy in
`docs/DESIGN-PRINCIPLES.md`** — read it; it governs modeling/design calls
(coherence over collection; nodes carry meaning + grain; concepts are the
semantic layer; capture the why; model for humans *and* machines).

## Active re-plan (2026-06)
Adopted `DESIGN-PRINCIPLES.md` and re-planned M2–M4 around it (BUILD-PLAN §4):
catalog gains **grain on sources** + definition-led readers + **decision↔node
links**; a new **M2.5 semantic layer** (Glossary + catalog/concepts in search +
coherence nudges) is pulled forward from polish; M4 gains a **machine-readable
context bundle**. PR #3 (catalog CRUD + concept linking) is the first slice and
stays as-is; the principle-driven additions land next.

## Where the build is (2026-06)
- **M0 Foundation** — done, **merged to `main`** (PR #1). App shell, Supabase
  auth (Google+GitHub), full Drizzle schema, RLS, seed.
- **M1 Knowledge core** — done. Wiki (TipTap editor, `[[wikilinks]]`, tree,
  backlinks), posts + decision records, tags + tag pages, FTS+trigram search,
  LinkedIn export.
- **Case Studies** — done. Gamified completion curriculum (9 technical + 8
  business tasks), per-task editor workspace, progress rings/tiles, "Room for
  improvement" unlock at 100%. Tasks are graph nodes; their starter docs link
  to the 6 seeded Concept pages.
- **Dorfromantik theme** — done. Parchment/ink + sage/terracotta/wheat/slate,
  Hanken Grotesk, paper grain, `.tile` cards. App-wide via tokens in
  `globals.css`.
- **M2 — Catalog** — in progress. **Done:** models/sources/columns CRUD
  (per-node detail + editor, inline column tests, PK/FK flags, observation
  metadata) and concept↔catalog linking (a "Related concepts" picker writes
  `links` rows; catalog refs show in a concept's backlinks, both directions).
  **Remaining:** lineage graph (React Flow over `model_dependencies`),
  relationships UI. Then M3 ERD, M4 polish.

### Polish backlog (agreed, not yet done)
- Export button uses a generic share icon (lucide v1 dropped brand icons) — want
  a custom LinkedIn SVG.
- Topbar search is a link to `/search`, not a live input / command palette
  (command palette is an M4 item).
- No light/dark toggle yet; the cozy `.dark` palette exists but isn't switchable.

## Git / deploy
- **Develop on branch `claude/pensive-bell-J2VAJ`.** It is the repo **default
  branch** and Vercel's **production branch**, so every push **redeploys the
  live site**. Only push green builds.
- Open PR for this work: **#2** (into `main`). `main` holds M0 only.
- Live app: **https://taro-snowy.vercel.app** (Vercel, free tier).
- Supabase project ref: **eargnrmjmgeiwvqgfaob**. DATABASE_URL must be the
  **transaction pooler** (port 6543); client sets `prepare:false`.
- Env vars (Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (accepts publishable `sb_publishable_*` too), `SUPABASE_SERVICE_ROLE_KEY`
  (accepts secret `sb_secret_*` too), `DATABASE_URL`.
- Never commit secrets; never ask the user to paste DB password / secret key in
  chat. Project URL + publishable key are public/OK.

## Migrations (IMPORTANT)
- Migrations live in `drizzle/` (checked in). **Applied so far: `0000_init`,
  `0001_case_studies`.** Policies: `supabase/policies.sql` (idempotent) +
  `supabase/policies_case_studies.sql`. Seed: `supabase/seed.sql` (6 concepts).
- The agent has **no DB access from the sandbox** unless a Supabase MCP server
  or `DATABASE_URL` env secret is configured. Generate migrations with
  `pnpm drizzle-kit generate` (no DB needed); the user (or the Supabase MCP)
  applies them. When you add a migration, tell the user exactly what to run, or
  use the Supabase MCP if present (`apply_migration` / `execute_sql`).
- Enum changes use `ALTER TYPE ... ADD VALUE` — don't use the new value in the
  same transaction.

## Stack realities (differs from training data — verify, don't assume)
- **Next.js 16** (not 15): `middleware` is **`proxy`** (`src/proxy.ts`, exports
  `proxy`). `params`/`searchParams` are Promises. Read bundled docs in
  `node_modules/next/dist/docs/` before nontrivial Next work (per AGENTS.md).
- **Tailwind v4** (CSS-first, `@theme inline` in `globals.css`; no JS config).
  No typography plugin — editor styles are hand-rolled `.tiptap` in globals.
- **shadcn "base-nova" = Base UI**, not Radix: use **`render={<X/>}`**, not
  `asChild`. Triggers/items take `render`.
- **lucide-react v1**: brand icons (Github, Linkedin) were removed — use custom
  SVGs.
- **TipTap v3**: `useEditor({ immediatelyRender: false })` to avoid hydration
  mismatch. Custom `[[wikilink]]` node in `src/components/editor/wikilink.ts`.
- **Drizzle + postgres-js**: `src/db/index.ts` is a lazy proxy (no network at
  import, so builds need no env). The Drizzle client **bypasses RLS** — it's for
  trusted server code; enforce visibility in app code (see below).
- React Flow installed but unused until M2/M3.

## Conventions
- **Reads**: Server Components + `src/db/queries/*`. **Mutations**: Server
  Actions, each starting with `requireOwner()` (or `requireSession()`).
- **AuthZ**: `src/lib/auth.ts` — `getSessionContext` provisions a `profiles` row
  on first sign-in (first user = owner, rest = viewer). Because the Drizzle
  client bypasses RLS, **filter visibility in app code** (owners see all; others
  never see `private`). RLS is defense-in-depth.
- **Graph**: `src/lib/links.ts` — `syncLinks(sourceType, id, doc)` reconciles
  `[[wikilink]]` → page targets (auto-creates stub pages for red links);
  catalog nodes have plain-text descriptions (no wikilinks) so they link to
  concepts via `setLinkedPages`/`getLinkedPages` (explicit picker, not parsed);
  `getBacklinks(type, id, {includePrivate})` resolves page/post/task/model/source
  sources; `nodeHref` routes them. Node types in use: `page`, `post`,
  `case_study`, `task`, `model`, `source`. Add a node type to the enum
  (migration) before storing its links.
- **Content** is TipTap JSON in `jsonb`. `src/lib/content.ts` walks it
  (`extractWikilinkTitles`, `excerpt`). `src/lib/export/markdown.ts` →
  LinkedIn markdown. `src/lib/slug.ts` slugifies; queries ensure uniqueness.
- **Tags**: `src/lib/tags.ts` (comma input → upsert by slug → reconcile
  `taggables`). **Search**: `src/lib/search.ts` (FTS + `pg_trgm`).
- **Verify before pushing**: `pnpm typecheck && pnpm lint && pnpm build`. Pure
  helpers can be smoke-tested with `node --experimental-strip-types`.

## Key paths
- `src/app/(app)/` — authed surfaces: `wiki/`, `blog/`, `decisions/`, `tags/`,
  `search/`, `case-studies/`, plus M2+ stubs `catalog/`, `erd/`.
- `src/app/(auth)/login`, `src/app/auth/callback` — OAuth.
- `src/components/` — `editor/`, `wiki/`, `posts/`, `search/`, `case-studies/`,
  `shell/` (sidebar/topbar/nav), `ui/` (shadcn).
- `src/db/schema.ts` — full data model; `src/db/queries/*` — typed helpers.
- `src/lib/case-studies/curriculum.ts` — the seeded task template.

## Optional: let the agent run migrations
Configure a Supabase MCP (env-level or `.mcp.json` with a `SUPABASE_ACCESS_TOKEN`
secret), or add `DATABASE_URL` as an environment secret so `psql` works. Either
removes the manual SQL-editor step.
