# taro — Spec Sheet (one page)

**What** A personal, portable knowledge platform for analytics engineering:
reference wiki + blog/decision log + ERD designer + data catalog, unified as one
linked knowledge graph.

**Why** Centralize a data philosophy (modeling, materialization, observation,
orchestration, ML/AI). Use it from day one as a staff analytics engineer; take it
between jobs. Examples, not IP. The stack is part of the portfolio.

**Positioning** Sits between data engineering ⟷ analytics/DS ⟷ product/design ⟷
business stakeholders. Stays in the analytics-engineering lane.

---

### Surfaces
| # | Surface | Core capability |
|---|---|---|
| 1 | **Wiki / Reference** | Block editor, page tree, `[[wikilinks]]`, backlinks, search, typed Concept pages (strategy library). |
| 2 | **Blog + Decision log** | Posts + ADR decision records; one-click LinkedIn export. |
| 3 | **ERD designer** | React Flow canvas over catalog models; export PNG/SVG/DBML/SQL/dbt. |
| 4 | **Data catalog** | Models/sources/columns/tests, lineage graph, observation metadata. |

### The integrating idea
Every object is a **node**; any node links to any node with **bidirectional
backlinks**. Concept ↔ model ↔ ERD node ↔ post are all one graph.

### Strategy-library pillars (seed content)
Modeling theory · Materialization · Observation · Orchestration · Testing & data
quality · ML/AI integration.

### Access
Owner (full read/write) · Viewer (authed read) · Public (per-post opt-in).
OAuth gates **both viewing and editing**. Default = private.

---

### Stack (all $0 free tier)
| Layer | Choice |
|---|---|
| Web | Next.js 15 (App Router, TypeScript) |
| UI | Tailwind CSS + shadcn/ui |
| Data | Supabase Postgres |
| ORM / migrations | Drizzle ORM (SQL-first, checked in) |
| Auth | Supabase Auth — Google + GitHub OAuth + RLS |
| Storage | Supabase Storage |
| Editor | TipTap (content as JSON in Postgres) |
| Canvas | React Flow (ERD + lineage) |
| Hosting | Vercel |

### Data model (tables)
`profiles` · `pages` · `posts` · `decision_meta` · `tags` · `taggables` ·
**`links`** (polymorphic graph glue) · `sources` · `models` · `columns` ·
`model_dependencies` · `relationships` · `diagrams` · `diagram_nodes` ·
`diagram_edges` · `attachments` · `revisions`.

### Milestones
- **M0** Foundation: app shell, Supabase, full Drizzle schema, auth + RLS.
- **M1** Knowledge core: editor, pages, posts/decisions, tags, search, LinkedIn export, seed strategy library.
- **M2** Catalog: models/sources/columns/tests, lineage, observation metadata.
- **M3** ERD designer: canvas, relationships, layouts, exports.
- **M4** Polish: command palette, revisions, public sharing, theming, deploy.

> Full detail: `docs/SPEC.md`. Build steps: `docs/BUILD-PLAN.md`.
