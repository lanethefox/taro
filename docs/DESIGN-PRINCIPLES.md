# taro — Design Principles

> The thinking behind *how* taro models knowledge. These are first principles,
> not a feature list — when a design question comes up ("should the catalog
> capture X?", "where does this link live?"), answer it from here. Companion to
> `SPEC.md` (what we build) and `BUILD-PLAN.md` (in what order).

## The core claim: coherence over collection

A pile of tables, pages, and posts is not knowledge. Knowledge is those things
**held together by shared identity and shared meaning** — one definition of
"Customer," one place the grain of `fct_orders` is stated, one graph where the
model, the concept that defines it, the decision that motivated it, and the post
that explains it all point at each other.

taro's job is not to *store* more artifacts. It is to keep them **coherent**: the
same concept means the same thing everywhere it appears, and every node can be
traced to the others. Most "data problems" are really coherence problems wearing
a technical costume (two teams, two definitions of "active user," contradictory
dashboards). taro is opinionated that the cure is explicit, linked meaning.

Everything below serves that claim.

---

## 1. A node carries its meaning, not just its structure

A catalog model is not a column list. It is three layers, and taro should make
all three first-class:

- **The *what*** — structure: types, keys, tests, materialization. (taro has this.)
- **The *so-what*** — a plain-language **definition** and the **grain**
  ("what does one row represent"). This is the layer most catalogs skip and the
  one that makes the artifact *usable*.
- **The *how-it-connects*** — relationships, lineage, tags, and links to the
  **concepts** that define its terms.

**In taro:** lead every node's reader view with *name → definition → grain →*
*structure → connections*, not the other way around. Grain and definition are
prompted and prominent in editors, not buried among optional metadata.

## 2. Concepts are the semantic layer

`concept` pages are taro's glossary and its single source of definitional truth.
"Customer," "Revenue," "Incremental materialization," "Grain" are each defined
**once**, and models / sources / columns / posts **point at** that definition
rather than re-stating (or silently contradicting) it.

**In taro:**
- A **Glossary** surface lists concepts as canonical definitions, each showing
  *defined here* and *used by* (its backlinks across the whole graph).
- The platform nudges toward coherence: when a node's text uses a term that has a
  concept but isn't linked, offer the link; flag near-duplicate concept titles
  (two definitions of the same word is the failure we exist to prevent).
- Coherence is a feature, not a lint rule — surfaced gently, never blocking.

## 3. Grain is a first-class fact

"What does one row represent?" is the question that, unanswered, silently
corrupts every downstream count and join. It belongs on **every** tabular node —
models *and* sources — stated in plain language and visible by default.

**In taro:** promote `grain` from one-field-among-many to a headline attribute;
add it to sources (not just models); show it prominently in readers and lineage.

## 4. Capture the *why*, not just the *what*

Flattening who/what/when/**why** is how models rot — a column exists, a decision
was made, and a year later nobody remembers the reasoning. taro already records
the *why* (decision records); the principle is to **attach it to the structure it
explains** so rationale travels with the node.

**In taro:** let decision records (and posts) link to catalog/concept nodes — a
model shows the decisions that shaped it; a decision shows the models it touched.
No new schema; the polymorphic `links` graph already carries it.

## 5. Model for humans *and* machines

Explicit definitions, self-describing names, and stated grain are what let a
search layer — and, later, an LLM/agent — **reason instead of guess**. Ambiguity
that a human can paper over with context becomes a confident wrong answer at
machine scale. Metadata is architecture, not plumbing.

**In taro:**
- Everything modeled (models, sources, columns, concept definitions) is
  **searchable** — the graph is only as useful as it is findable.
- Encourage clarity at author time (clear names, a definition, a grain) with
  nudges, not hard gates.
- North star: a **machine-readable context bundle** (definitions + grain +
  relationships + links as JSON) that an agent could consume to answer questions
  about the modeled world without hallucinating. (Direction, not near-term.)

## 6. Many forms, one fabric

Today taro models the structured/tabular world (models, sources, columns) and
the prose world (pages, posts). That is deliberate scope, not a ceiling. The
node-type enum and polymorphic links are designed so new **forms** — events,
unstructured content, ML/feature artifacts, diagrams — can enter the same fabric
later without re-architecting. Don't hard-code "every node is a table"; don't
build the other forms before there's a real need.

## 7. Build just-in-time; harden what becomes load-bearing

Model to the question in front of you, not to an imagined future. Ship a thin
slice, see if it's used, and only then invest in rigor (tests, docs, refactor) —
the moment a "temporary" model becomes something others depend on, pay that tax
deliberately. This is the working cadence for taro's own development, slice by
slice.

---

## How this re-shapes the roadmap

The principles don't discard the milestone plan — they add a **semantic-layer
thread** and re-order so coherence shows up early rather than as polish.

| Principle | Lands in taro as | Milestone |
|---|---|---|
| Node carries meaning (1) | grain + definition prominent on every node | M2 (catalog) |
| Concepts are the semantic layer (2) | **Glossary** surface; link/dup nudges | M2.5 (new) |
| Grain first-class (3) | grain on sources; headline in readers | M2 |
| Capture the why (4) | decision↔catalog/concept links | M2 |
| Model for machines (5) | catalog + concepts in search; later, context export | M2.5 → M4 |
| Many forms (6) | keep node enum open; no build yet | — |
| Just-in-time (7) | the slice cadence itself | ongoing |

See `BUILD-PLAN.md` §4 for the revised M2–M4 checklists.
