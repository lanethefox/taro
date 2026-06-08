# Phase 2 — Taro, the analytics-engineering control center

> Status: PLAN (for sign-off). Phase 1 (the wiki) is the foundation. Nothing here
> is built yet. Revised per direction: dbt importer first, FinOps as a primary
> pillar, domain-specific content per arm, owner-only mutations, full scope (no
> stretch goals).

## 1. The idea in one paragraph

Phase 1 gave taro a **rubric**: ten wiki sections that say what good analytics
engineering looks like. Phase 2 points that rubric at the **real platform**.
"Taro" the control center ingests a live dbt project, exposes the heart of the
data platform (sources, models, columns, lineage, relationships, definitions,
and cost), scores every piece against the principles, attributes spend to each
arm of the business as a cost center, and drives the AE team's work to bring
each arm into conformance. The wiki is the standard; the control center is where
the standard meets the warehouse, the bill, and the org.

The one-line test for every feature: **does it help the AE team see where the
platform diverges from the principles or the budget, and act on it?**

## 2. Three pillars

1. **The platform, ingested and exposed** — pull a real dbt project in and make
   the catalog the live picture of the warehouse (the importer, below).
2. **Conformance** — score every node against the principles, roll up per arm,
   drive remediation.
3. **FinOps** — attribute warehouse cost to model, layer, and arm; treat each arm
   as a cost center with budget vs actual; surface waste. A first-class pillar,
   not an afterthought, because cost is the lever the AE team is judged on.

Each arm of the business (Marketing, Sales, CX, Finance, Operations, Platform)
gets its own control panel that fuses all three plus **domain-specific content**,
deep-linked to its wiki section.

## 3. What already exists (reuse, not rebuild)

- **Catalog** (`sources`, `models`, `columns`, `modelDependencies`,
  `relationships`) already carries the signals to score and the slots the
  importer writes into: `grain`, `layer`, `materialization`, `ownerId`,
  `description`, `freshnessSla`, `expectedVolume`, `monitoringNotes`, column
  `tests`, `isPk`/`isFk`.
- **Catalog editors** exist (`saveModelAction`, `reconcileColumns`) — remediation
  links back to them.
- **The graph** (`links`, `getKnowledgeGraph`, `getLinkedPages`/`setLinkedPages`)
  binds catalog nodes to wiki concept pages and decisions — how a failing check
  points at the principle that explains the fix.
- **Lineage / ERD**, **context bundle** (`/api/context`), **glossary**, **search**,
  and the conventions (server components for reads, `requireOwner()` server
  actions, Zod, Drizzle migrations, Base UI `render=`).

## 4. What's new

### 4a. Platform ingestion — the dbt artifact importer (the bridge)

The thing that turns taro from a hand-curated catalog into a live control center.
It parses the artifacts a dbt run produces and upserts the catalog:

- **`manifest.json`** → models and sources (name, `layer` from path/config,
  `materialization`, `description`, `meta.owner`, `meta.domain`, `grain` from
  meta/description), columns (name, `description`, `tests` from declared data
  tests), `modelDependencies` (the `depends_on` graph), and `relationships`
  (from `relationships` tests / declared FKs).
- **`catalog.json`** → column `dataType`, and detected PK/FK where available.
- **`run_results.json`** → per-model execution timings and status (feeds both
  freshness and the FinOps cost proxy).

Shape: a pure parser in `src/lib/ingest/dbt.ts` (artifacts in → catalog upserts
out, deterministic, smoke-testable) plus an owner-only **upload action**
(`/taro/import`: drop the three JSON files, preview the diff, apply). Idempotent
upsert keyed by dbt `unique_id`, so re-importing a later run updates in place.
Mapping dbt `meta.domain` (or folder) → a Taro **domain** is part of the import,
so assignment is mostly automatic.

This replaces the ClassDojo demo rows as the source of truth once a real project
is imported (the demo stays as seed/fallback for an empty install).

### 4b. Data model (one migration, `0004_taro_control_center`)

- **`domains`** — the arms = cost centers. `id, name, slug, description,
  content (jsonb, TipTap, the domain-specific editorial), ownerId (→ profiles),
  conceptPageId (→ wiki section), monthlyBudget (numeric), visibility, position`.
  Seeded: Marketing, Sales, Customer experience, Finance, Operations, Platform.
- **`models.domainId` / `sources.domainId`** — nullable FK; "unassigned" is a finding.
- **`models.dbtUniqueId` / `sources.dbtUniqueId`** — importer upsert key (nullable).
- **`conformanceChecks`** — the rubric, seeded in code. `key, title, description,
  principlePageId (→ wiki page), appliesTo, weight, severity, enabled`.
- **`conformanceResults`** — `id, runId, nodeType, nodeId, checkKey, status, detail,
  runAt`. Kept per run for trend.
- **`remediations`** — `id, nodeType, nodeId, checkKey, title, status, assigneeId,
  domainId, note, createdAt, resolvedAt`.
- **FinOps cost model** — a configurable **cost function per node** plus measured
  **usage per period**, attributed up: source/model → domain (cost center) →
  platform. Three tables:
  - **`costConfigs`** — the AE-configurable cost function. `id, scope
    (source|model|global), nodeId (nullable for the global compute default), unit
    (text: MAR, MTU, events, rows, GB, seconds...), method (flat|per_unit|tiered),
    fixedCost (numeric), perUnitRate (numeric), tiers (jsonb [{upTo, rate}]),
    currency, notes, updatedBy, timestamps`. Each source gets its real-world cost
    function (Fivetran MAR, Segment MTU, etc.); models inherit a global compute
    rate unless overridden.
  - **`costUsage`** — measured units per node per period. `id, nodeType, nodeId,
    period (date), units (numeric), source (manual|run_results|import), note`.
    For sources: the driver volume (e.g. MAR). For models: `run_seconds` from
    `run_results.json`.
  - **`costFacts`** — the computed snapshot per node per period (config applied to
    usage) for trend and rollups: `id, nodeType, nodeId, period, cost (numeric),
    unit, units (numeric), computedAt`.
- **`importRuns`** — audit of each artifact import (`id, fileNames, counts,
  importedAt, importerId`).

### 4c. The conformance rubric (checks → principles)

The proposed set, each a deterministic function mapped to a wiki page so a
failure links to the fix:

| Check | Signal | Principle page |
|---|---|---|
| Grain defined | `grain` non-empty | Grain |
| Owned | `ownerId` / `domainId` set | Who owns the dbt project |
| Documented | `description` + columns described | Auditing a dbt project |
| Has primary key | a column `isPk` | Entities, instances & identifiers |
| PK tested | PK has not_null + unique | Testing & data quality |
| Tested | columns carry `tests` | Testing & data quality |
| Linked to a concept | `links` → wiki concept | Semantics & the semantic layer |
| Has the "why" | `links` → a decision | Decisions / ADRs |
| In lineage (not a root) | in `modelDependencies` | dbt sprawl and the missing core |
| Layering correct | staging refs sources only; marts don't ref sources | dbt anti-patterns |
| No view-on-view chain | `materialization` over lineage depth | dbt anti-patterns |
| Freshness SLA set | `freshnessSla` non-empty | Data observability |

Node score = weighted pass rate; domain score = rollup; platform score = rollup.

### 4d. FinOps / cost centers (primary)

- **Configurable cost functions (AE-owned)**: every source gets its real-world
  cost function via `costConfigs` — a unit (Fivetran MAR, Segment MTU, event
  volume, rows, GB), a method (flat / per-unit / tiered), and rates/tiers the AE
  team edits. Models inherit a global compute rate (per `run_seconds`) unless
  overridden. This is the heart of the FinOps pillar: cost is modeled, not guessed.
- **Usage → cost**: `costUsage` holds measured units per node per period (source
  drivers entered/imported; model `run_seconds` from `run_results.json`).
  Applying the config to usage yields `costFacts`, rolled up source/model →
  domain (cost center) → platform.
- **Token / LLM cost**: AI token spend is just another configurable cost function
  in the same model — no schema change. An AI provider (Claude, the dbt MCP /
  text-to-SQL path, an agent) is a cost node whose `unit` is tokens (or
  input/output tokens), with a per-unit or tiered `perUnitRate` in `costConfigs`;
  `costUsage` records tokens consumed per period, attributed to the arm that
  consumed them. As Taro serves governed context to agents (M6 / "serving data to
  AI agents"), the tokens those agents burn roll into the same per-arm cost
  centers as warehouse compute and ingestion. So FinOps covers the whole bill:
  ingestion (per-source functions) + transformation (compute) + serving (tokens).
- **Backfill prediction**: a pure estimator (`src/lib/cost/backfill.ts`) shows the
  predicted cost of a backfill at **column, model, and source** level before you
  run it — config × the units a backfill would reprocess (over a chosen window,
  from usage history or a manual volume), with a model backfill optionally
  including downstream descendants via lineage, and a column estimated as its
  share of the node. Surfaced on each node's detail and in a `/taro/cost`
  backfill calculator.
- **Surfaces**: spend by domain / layer / source / model, **budget vs actual per
  arm**, top spenders, trend, the backfill predictor, and **waste** (cost of
  unused models from the audit, and full-refresh-heavy models). "Cost as a data
  product" and "dbt cost and economics" made operational.

## 5. The surface (nav + routes)

New top-level **Taro** nav section (owner-gated; approved viewers read-only),
before "About".

- **`/taro`** — control-center home: platform at a glance (counts, overall
  conformance %, total spend vs budget), a tile per arm (score + cost + open
  gaps), top findings, recent activity, last import.
- **`/taro/import`** — drop dbt artifacts, preview the diff, apply.
- **`/taro/conformance`** — full scorecard; every node scored, filter by
  domain/layer/owner/check; drill into a node's checks → principle + catalog editor.
- **`/taro/cost`** — the FinOps dashboard: spend by arm/layer/model, budget vs
  actual, top spenders, trend, waste.
- **`/taro/domains/[slug]`** — per-arm control panel: its domain-specific content,
  its models/sources, score + trend, cost-center budget vs actual, gaps, owner,
  and a link to its wiki section (e.g. Finance analytics).
- **`/taro/audit`** — anti-pattern findings over the real catalog + lineage;
  convert to remediation in one click.
- **`/taro/remediation`** — the AE worklist; assignable, status-tracked, auto-closes
  when the check re-scores green.
- **`/taro/metrics`** — semantic-layer governance: canonical metric definitions,
  owner, where-used, "defined once?" conformance (builds on glossary).

## 6. Workflows (the AE control loop)

1. **Ingest** — import dbt artifacts; catalog + lineage + costs refresh; domains auto-map.
2. **Assess** — run conformance; score nodes, roll up per arm; refresh findings and cost.
3. **Triage** — review `/taro/audit` and `/taro/cost`; convert gaps and overspend into remediations; assign to the arm's owner.
4. **Remediate** — owner fixes in the catalog editor; the check re-scores green; the item closes.
5. **Govern** — a per-domain "definition of done" (minimum conformance + budget); the dashboard trends each arm toward it (the CI ratchet from "Preventing re-sprawl").
6. **Serve** — the home + per-arm scorecards are the exec view; `/api/context`,
   extended with conformance + cost + ownership + domain, serves governed context
   to AI agents (the "serving data to AI agents" end state, made real).

## 7. Roles & visibility

Owner-only for all mutations (import, assign, run conformance, manage
remediations, edit domain content, set budgets). Approved users get read-only
dashboards; private nodes filtered as today. No new role.

## 8. Build order (full scope, importer first, FinOps primary)

- **M1 — Ingestion + domains.** Migration (domains, domainId, dbtUniqueId,
  importRuns); the dbt artifact parser + `/taro/import` upload/preview/apply;
  seed the arms and auto-map from dbt meta; nav + `/taro` shell.
- **M2 — Conformance engine + scorecard.** Rubric in `src/lib/conformance/`,
  `/taro` live scores, `/taro/conformance` drill-in to principles + editor.
- **M3 — FinOps / cost centers.** `modelCosts` + cost derivation from run_results
  (configurable rate, manual override); `/taro/cost`; per-arm budget vs actual; waste.
- **M4 — Audit + remediation.** Anti-pattern detection; `/taro/audit`;
  `remediations` + `/taro/remediation`; auto-close on pass.
- **M5 — Domain control panels + content + trend.** `/taro/domains/[slug]`
  fusing score + cost + gaps + domain-specific content + wiki link; snapshot
  trends; per-domain definition of done.
- **M6 — Metrics governance + agent context.** `/taro/metrics`; conformance- and
  cost-aware `/api/context`.

Verification each milestone: `pnpm typecheck && pnpm lint && pnpm build`; pure
libs (parser, scoring, cost) smoke-tested with `node --experimental-strip-types`;
migrations generated with drizzle-kit and applied via the Supabase MCP.

## 9. Decisions (locked)

1. **dbt artifacts**: **round-trip the demo catalog.** Generate `manifest.json` /
   `catalog.json` / `run_results.json` from the existing ClassDojo catalog, import
   them, and verify the catalog is reproduced. This proves the importer against
   known data before real artifacts are dropped in. The upload UI accepts real
   artifacts whenever they arrive.
2. **FinOps cost source**: **derive from `run_results.json` build timings** times a
   configurable warehouse rate, with a manual override. Artifact-only (no
   warehouse credentials), with a clean seam to plug real warehouse cost views in
   later.
3. **Scope**: full (M1–M6), nothing parked as a stretch; FinOps is a primary
   pillar; each arm gets domain-specific content.
4. **Roles**: owner-only mutations; approved users read-only.
5. **Rubric**: the §4c check set, tunable later.

## 10. Build status

- **M1 (done)** — phase-2 data model (migration 0004); dbt artifact importer
  (parser + apply); `/taro` nav + control-center landing; owner-only
  `/taro/import`; six arms seeded and assigned.
- **M2 (done)** — conformance engine (12 checks → principles) + scoring/rollups;
  `/taro/conformance` scorecard with per-node drill-in; platform + per-arm scores
  on the control center.
- **M3 (done)** — FinOps. Configurable cost functions (`cost_configs` per-source
  + global compute), usage → cost (`src/lib/cost/compute.ts`, smoke-tested),
  per-arm budget-vs-actual + by-layer + top spenders (`/taro/cost`), the
  **backfill predictor** (`src/lib/cost/backfill.ts`) at source/model/column
  level, an owner cost-function **editor** (`/taro/cost/config`), and **token/LLM
  cost** modeled as a Claude API source with a per-token function.
- **M4–M6** follow per §8 (audit + remediation; domain panels + content + trend;
  metrics governance + agent context).

