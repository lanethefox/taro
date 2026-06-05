# taro — Product & Technical Specification

This is the whole system, specified up front. The four surfaces (wiki, blog,
ERD, catalog) are intentionally designed as one integrated graph, not as
independent features bolted together. Read this top to bottom; the data model in
§5 is the glue that makes the integration claims in §4 real.

---

## 1. Purpose & positioning

taro is a single-user-owned (multi-viewer) web platform that centralizes an
analytics engineer's working knowledge and demonstrates it through live
artifacts.

It serves three jobs at once:

1. **Reference** — the canonical, evolving statement of how I think about data
   modeling and analytics engineering.
2. **Narrative** — a running blog + decision log that turns daily work into
   shareable, IP-safe writing (LinkedIn-ready).
3. **Proof** — interactive ERDs and a data catalog that show, not tell.

**Positioning.** taro sits at the seam of the modern data org and speaks to all
sides of it:

```
Product / Design ─┐
Data Engineering ─┼─►  ANALYTICS ENGINEERING (taro)  ─►  Analytics / DS
                  ┘                                       Business stakeholders
                                                          (product, marketing,
                                                           sales, CX, finance)
```

taro deliberately stays in the analytics-engineering lane: modeling, semantics,
transformation, materialization, observation, and orchestration of the analytics
layer — not low-level data-engineering infrastructure.

**Principles**
- Examples, not IP. Nothing that's proprietary to an employer.
- Portable. The system and its content travel between jobs.
- Fresh start. Prior work informs but never dictates structure.
- The stack is part of the portfolio — modern, credible, demo-worthy.

---

## 2. Primary users & access

- **Owner (me).** Full read/write across everything. Authenticated via Google or
  GitHub.
- **Viewer.** Authenticated (Google/GitHub) read access — for sharing the wiki /
  catalog / ERDs with colleagues or interviewers.
- **Public (optional, per-object).** Specific blog posts may be flipped to public
  so they can be linked from LinkedIn without a login. Everything else requires
  auth.

Auth gates **both viewing and editing** (a hard requirement). Default visibility
for any object is private.

---

## 3. The integrating idea: one knowledge graph

Every meaningful object in taro is a **node** in a single graph, and any node can
**link** to any other node. That graph is what makes taro more than four separate
tools.

Node kinds:

| Node | What it is |
|---|---|
| **Page** | A wiki / reference article (incl. typed "Concept" pages). |
| **Post** | A blog entry or a decision record (ADR). |
| **Source** | A raw/external data source feeding the warehouse. |
| **Model** | A catalog entry for a transformed table/view (dbt-model-like). |
| **Column** | A field on a Source or Model. |
| **Diagram** | An ERD (a saved view over Models + relationships). |
| **Tag / Concept** | Taxonomy node (e.g. "incremental", "dimensional modeling"). |

Links are **bidirectional**: every node shows its **backlinks** ("referenced by").
Examples of the integration this enables:

- A Concept page *Incremental materialization* → lists every Model whose
  `materialization = incremental`, plus the blog posts that mention it.
- An ERD node → opens its catalog Model → which links to the Concept pages for its
  materialization & observation strategy → which link back to posts.
- A decision record *"Adopt one-big-table for product analytics"* → links the
  Models it affected and the Concept it argues for.

Authoring links: wiki-style `[[Title]]` references inside the editor resolve to
nodes and create graph edges automatically; relationships in the catalog/ERD are
first-class edges too.

---

## 4. Modules

### 4.1 Wiki / Reference

- Hierarchical **page tree** (pages have an optional parent) *and* free-form graph
  links across the tree.
- **Block editor** (TipTap): headings, lists, code blocks with syntax
  highlighting, tables, callouts, images, and SQL blocks. Content stored as
  structured JSON in Postgres (not HTML/markdown) so it's queryable and linkable.
- `[[wikilinks]]`, **backlinks panel**, tags.
- **Concept pages** are a typed subset of pages that represent the strategy
  library (see §4.5) and are the canonical link targets for catalog metadata.
- Full-text **search** across all pages/posts (Postgres FTS + trigram fuzzy).

### 4.2 Blog + Decision log

- **Posts** with `type` = `blog` or `decision`, a `status`
  (`draft` / `published`), `published_at`, tags, and the same block editor.
- **Decision records (ADRs)** add structured fields: *context, decision,
  consequences, status* (`proposed`/`accepted`/`superseded`), and an optional
  `supersedes` link to a prior decision — a real, navigable decision history.
- **LinkedIn export**: one click renders a post to clean markdown / plain text
  (front-matter stripped, images linked) for copy-paste. This is a core workflow,
  not an afterthought.
- Per-post **visibility** (`private` / `viewer` / `public`).

### 4.3 ERD designer

- Interactive canvas (**React Flow**): nodes are data models (tables showing their
  columns + types + keys), edges are relationships with cardinality
  (1:1 / 1:N / N:N) and the join columns.
- A diagram is a **saved view over catalog entities** — ERD nodes are backed by
  catalog **Models**, so editing a table in the ERD updates the catalog and vice
  versa (single source of truth, no drift).
- Save node **positions / sizes** per diagram; multiple diagrams can include the
  same model (e.g., a "marts" diagram and a "staging" diagram).
- **Export**: PNG/SVG for slides, plus structured export to **DBML**, **SQL DDL**,
  and **dbt `schema.yml`** — so an ERD becomes real, usable scaffolding (the
  "POC you can take into a workplace").

### 4.4 Data catalog

- **Models** with: name, description, **layer**
  (`staging` / `intermediate` / `marts`), **materialization**
  (`view` / `table` / `incremental` / `ephemeral`), **grain**, owner, tags, and
  the SQL/logic notes.
- **Sources**: external/raw inputs with freshness expectations.
- **Columns** on models/sources: name, data type, description, `is_pk` / `is_fk`,
  and inline **tests** (`not_null`, `unique`, `accepted_values`, `relationships`).
- **Lineage**: model→model dependencies render as a directed graph (React Flow),
  derived from declared dependencies — upstream/downstream navigation.
- **Observation metadata**: per model/source freshness SLA, expected volume, and
  monitoring notes — making the "observation strategy" theory concrete and
  attached to the actual objects.

### 4.5 Strategy library (content pillars)

Curated **Concept pages** that are the reference backbone and the canonical link
targets from the catalog:

- **Modeling theory** — dimensional (Kimball), one-big-table, activity schema,
  data vault, semantic layers, normalization trade-offs.
- **Materialization strategies** — view vs. table vs. incremental vs. ephemeral;
  when and why; cost/perf trade-offs.
- **Observation strategies** — freshness, volume, distribution, anomaly detection,
  contracts, alerting.
- **Orchestration strategies** — scheduling, dependency graphs, backfills, CI/CD
  for transformations, environments.
- **Testing & data quality** — test taxonomy, coverage strategy, contracts.
- **ML / AI integration** — feature/marts hand-off to ML, embeddings &
  vector stores in the warehouse, LLM-assisted documentation & semantic search,
  AI in the analytics workflow.

These aren't just prose: catalog objects reference them, so the theory and the
practice are linked both directions.

---

## 5. Data model (Postgres)

Conceptual schema (Drizzle-defined; names indicative). `jsonb` content is TipTap
document JSON. All tables carry `id`, `created_at`, `updated_at`.

**Auth / identity** (managed largely by Supabase Auth)
- `profiles` — `user_id` (fk auth.users), `display_name`, `role`
  (`owner` / `viewer`), `avatar_url`.

**Knowledge**
- `pages` — `title`, `slug`, `parent_id?`, `kind` (`wiki` / `concept`),
  `content jsonb`, `search_tsv`, `visibility`.
- `posts` — `title`, `slug`, `kind` (`blog` / `decision`),
  `status`, `published_at?`, `content jsonb`, `search_tsv`, `visibility`.
- `decision_meta` — `post_id` (fk), `context`, `decision`, `consequences`,
  `status`, `supersedes_id?`.

**Taxonomy & graph**
- `tags` — `name`, `slug`, `color`.
- `taggables` — polymorphic (`node_type`, `node_id`, `tag_id`).
- `links` — the backlink graph: `source_type`, `source_id`, `target_type`,
  `target_id`, `context?`. (Powers `[[wikilinks]]`, "referenced by", and
  concept↔catalog links.)

**Catalog**
- `sources` — `name`, `description`, `system`, `freshness_sla?`,
  `expected_volume?`.
- `models` — `name`, `description`, `layer`, `materialization`, `grain?`,
  `owner_id?`, `sql_notes?`, `freshness_sla?`.
- `columns` — `parent_type` (`model` / `source`), `parent_id`, `name`,
  `data_type`, `description?`, `is_pk`, `is_fk`, `tests jsonb`.
- `model_dependencies` — `upstream_id`, `downstream_id` (lineage edges).
- `relationships` — `from_model_id`, `from_column_id`, `to_model_id`,
  `to_column_id`, `cardinality`.

**Diagrams (ERD)**
- `diagrams` — `name`, `description?`.
- `diagram_nodes` — `diagram_id`, `model_id`, `x`, `y`, `w`, `h`, `collapsed`.
- `diagram_edges` — `diagram_id`, `relationship_id` (or explicit from/to).

**Media**
- `attachments` — `storage_path`, `mime`, `node_type?`, `node_id?` (Supabase
  Storage objects).

Notes:
- `links` being polymorphic is what lets *any* node reference *any* node — the
  core of §3.
- `relationships` is shared by the catalog and the ERD; diagrams never store table
  truth, only layout.
- Search uses generated `tsvector` columns + GIN indexes; `pg_trgm` for fuzzy.

---

## 6. Architecture

- **Next.js 15 App Router**, TypeScript end to end. Server Components for reads;
  **Server Actions** for mutations; route handlers for export endpoints.
- **Drizzle ORM** against Supabase Postgres; migrations checked into the repo
  (`/drizzle`). Schema-as-code is itself an analytics-engineering artifact.
- **Supabase Auth** for Google + GitHub OAuth; **Row-Level Security** enforces
  visibility (`owner` writes; `viewer` reads non-private; `public` reads only
  `visibility = public`).
- **Supabase Storage** for images/attachments.
- **TipTap** editor with a custom wikilink extension that writes `links` rows on
  save.
- **React Flow** for both the ERD canvas and the lineage graph (shared node/edge
  components).
- **Zod** for input validation; **TanStack Query** only where client-side caching
  helps (canvas, search).
- **Vercel** deploy; environment secrets for Supabase keys + OAuth client
  credentials.

```
Browser (Next.js RSC + React Flow + TipTap)
   │  Server Actions / Route Handlers
   ▼
Next.js server  ──Drizzle──►  Supabase Postgres (RLS)
   │                                  ▲
   └── Supabase Auth (Google/GitHub) ─┘
        Supabase Storage (media)
```

---

## 7. Cross-cutting concerns

- **Search** — global command-palette search over pages, posts, models, columns;
  Postgres FTS ranked, trigram fallback.
- **Backlinks** — every node view renders "referenced by" from `links`.
- **Export** — posts→markdown (LinkedIn); ERD→PNG/SVG/DBML/SQL/dbt yml;
  whole-catalog→JSON.
- **Versioning** — `updated_at` + an append-only `revisions` table for pages/posts
  (lightweight history; full diffing is a later nicety).
- **Theming** — light/dark; clean reading typography (this is a writing tool).
- **Seed content** — strategy-library Concept pages ship as seed data so taro is
  useful on day one.

---

## 8. Delivery milestones

The system is designed as a whole; it's still *built* in an order. These are
milestones of one integrated platform, each one leaving taro usable.

- **M0 — Foundation.** Next.js + Tailwind/shadcn, Supabase project, Drizzle schema
  & migrations for the full data model in §5, Supabase Auth (Google + GitHub),
  RLS, app shell + navigation.
- **M1 — Knowledge core.** TipTap editor, pages (tree + wikilinks + backlinks),
  posts (blog + decision records), tags, search, LinkedIn export. Seed the
  strategy library.
- **M2 — Catalog.** Models / sources / columns / tests, dependencies + lineage
  graph, observation metadata, concept↔catalog linking.
- **M3 — ERD designer.** React Flow canvas over catalog models, relationships with
  cardinality, layouts, export to PNG/SVG/DBML/SQL/dbt.
- **M4 — Polish & demo.** Command palette, revisions/history, public post sharing,
  theming, deploy to Vercel with a custom domain.

---

## 9. Open questions / decisions to revisit

- **Auth library**: Supabase Auth (chosen, simplest with the platform) vs Auth.js
  if we later want providers Supabase doesn't cover.
- **Public sharing model**: per-post public flag (planned) vs a separate published
  static site generated from posts.
- **Editor storage**: TipTap JSON (chosen) vs MDX — revisit only if we want
  git-native blog portability.
- **Lineage source of truth**: manually declared dependencies (planned) vs parsing
  real SQL later for auto-lineage.
