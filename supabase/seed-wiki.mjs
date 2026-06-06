// taro — wiki seed generator.
//
// Emits supabase/seed_wiki.sql: a set of de-branded data-modeling reference
// pages (Concept + one wiki index), cross-linked via [[wikilinks]]. A trailing
// jsonb_path block derives the page→page `links` rows straight from the embedded
// wikilinks, so the knowledge graph wires itself. Run:
//   node supabase/seed-wiki.mjs > supabase/seed_wiki.sql
//
// Source material: a data-modeling text on modeling across forms and consumers.
// Deliberately de-branded — no martial-arts framing; "camps" become
// "perspectives". The ideas, in taro's voice.

/* ---- tiny block DSL → TipTap JSON --------------------------------------- */

/** Split a string into inline nodes, turning [[Title]] into wikilink atoms. */
function inline(s) {
  const out = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ type: "text", text: s.slice(last, m.index) });
    out.push({ type: "wikilink", attrs: { title: m[1].trim() } });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ type: "text", text: s.slice(last) });
  return out.length ? out : [{ type: "text", text: s }];
}

const h = (s) => ({ type: "heading", attrs: { level: 2 }, content: inline(s) });
const p = (s) => ({ type: "paragraph", content: inline(s) });
const ul = (items) => ({
  type: "bulletList",
  content: items.map((i) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: inline(i) }],
  })),
});
const doc = (blocks) => ({ type: "doc", content: blocks });

/* ---- the pages ----------------------------------------------------------- */

const pages = [
  {
    title: "Data modeling",
    slug: "data-modeling",
    kind: "wiki",
    parent: null,
    body: [
      p("Data modeling is how we decide what our data means and how its pieces fit together — before and while we build the systems that store it. taro treats every model as part of one connected graph, so a table, the concept that defines its terms, and the decision that shaped it all point at each other."),
      h("The building blocks"),
      p("Most modeling questions come back to a small set of fundamentals. Learn these and you can model almost anything."),
      ul([
        "[[What data modeling is]] and [[Why data modeling matters]].",
        "[[The forms of data]] — not everything is a table.",
        "[[Entities, instances & identifiers]], [[Attributes]], and [[Relationships]].",
        "[[Grain]] and [[Counting & aggregation]].",
        "[[Time in data modeling]] and [[Semantics & the semantic layer]].",
      ]),
      h("Putting it to work"),
      ul([
        "[[Perspectives on a model]] — the same thing modeled for different consumers.",
        "[[Seeing the business]] — processes, domains, and shared language.",
        "[[Data modeling as continuous practice]].",
      ]),
      p("These connect to the strategy library: [[Modeling theory]], [[Materialization strategies]], [[Observation strategies]], [[Orchestration strategies]], [[Testing & data quality]], and [[ML / AI integration]]."),
    ],
  },
  {
    title: "What data modeling is",
    slug: "what-data-modeling-is",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("A data model organizes and standardizes data into a precise, structured representation — one that guides both human and machine behavior, informs decisions, and enables action. It is not the database, not a single methodology, and never quite finished."),
      h("Model for humans and machines"),
      p("Models have always served machines; today they also serve search and AI agents that read definitions to answer questions. Explicit meaning is what lets a person, a query, and an agent work from the same understanding — see [[Semantics & the semantic layer]]."),
      h("What it is not"),
      ul([
        "Not perfect — a model is a useful approximation of a slice of reality, not a replica.",
        "Not just physical storage — structure, relationships, and meaning come first; the table layout follows.",
        "Not a single approach — normalized, dimensional, document, graph, and feature models are tools, not rival faiths. See [[Modeling theory]].",
        "Not one-and-done — see [[Data modeling as continuous practice]].",
      ]),
    ],
  },
  {
    title: "Why data modeling matters",
    slug: "why-data-modeling-matters",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("The question is never whether you have a data model — the lack of one is still a model, just a poor one. The question is whether it is coherent. Most so-called data problems are really disagreements about meaning: two teams, two definitions of “customer,” contradictory dashboards."),
      h("Coherence is the payoff"),
      p("A good model aligns data with how the business actually works — its vocabulary, rules, and workflows — so people and machines share one understanding. That shared definition is what makes the numbers trustworthy. See [[Seeing the business]]."),
      h("There is no free lunch"),
      p("Every shortcut is a loan. Skipping the modeling work trades a little speed now for technical, data, and organizational debt later — fragile pipelines, conflicting metrics, and eroded trust that compound. Modeling is what lets you move faster safely, not slower."),
    ],
  },
  {
    title: "The forms of data",
    slug: "forms-of-data",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("Not everything is a table. A data modeler works across several forms, and each demands its own approach. The fundamentals — [[Entities, instances & identifiers]], [[Attributes]], [[Relationships]], [[Grain]], [[Time in data modeling]], and [[Semantics & the semantic layer]] — apply to all of them."),
      ul([
        "Structured — rows and columns with enforced types; the home of relational and dimensional models.",
        "Semi-structured — JSON, events, and nested documents; flexible, but easy to model badly.",
        "Unstructured — text, images, audio, video; you impose structure through metadata and derived features.",
        "ML/AI artifacts — features, embeddings, model outputs, and agent traces; data in their own right.",
        "Metadata — data about data: definitions, lineage, freshness, quality. Increasingly a first-class citizen.",
      ]),
      p("A single event — an order, say — usually lives in several forms at once, tied together by a shared identifier. Keeping those representations consistent is the work. See [[Perspectives on a model]]."),
    ],
  },
  {
    title: "Entities, instances & identifiers",
    slug: "entities-and-identity",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("An entity is a thing worth modeling — a customer, an order, a shipment. If you cannot name and identify it, you cannot model it. Each specific occurrence is an instance, and each instance needs an identifier to tell it apart from the rest."),
      h("Identifiers"),
      p("Good identifiers are unique, stable, and simple. A natural key uses a real-world value (an email, an ISBN); a surrogate key is system-generated (a sequence or UUID). Natural keys are readable but tend to change; surrogate keys are stable and fast to join. Many systems keep a surrogate primary key and natural keys as indexed lookups."),
      h("Distinctions that matter"),
      ul([
        "Strong vs. weak entities — a weak entity (an order line) cannot exist without its parent (an order).",
        "Types and subtypes — a Product type with Physical and Digital subtypes that share a core and add their own.",
        "An entity is a concept, not a table — the same customer is a row, a document, a feature vector, and a graph node. See [[Perspectives on a model]].",
      ]),
    ],
  },
  {
    title: "Attributes",
    slug: "attributes",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("Attributes are the properties that describe an entity — an order's date, total, and status. They are the vocabulary you use to describe your domain, so name them well."),
      h("Naming"),
      ul([
        "Clarity — prefer order_date to date; avoid reserved words.",
        "Consistency — pick one convention (snake_case, say) and hold it everywhere.",
      ]),
      h("Watch for"),
      ul([
        "Nulls — decide what missing means; remember aggregates skip nulls while scalar math is poisoned by them.",
        "Attribute bloat — when an entity needs the word “and” to describe it, it has become a junk drawer; split it.",
      ]),
      p("Different consumers reshape the same attribute: a descriptive property becomes a dimension for analytics and a feature for a model. See [[Perspectives on a model]] and [[Grain]]."),
    ],
  },
  {
    title: "Relationships",
    slug: "relationships",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("A relationship is a connection between entities — it is what turns isolated facts into a coherent picture. taro stores relationships as first-class edges in one graph, so any node can reference any other and every node shows its backlinks."),
      h("Cardinality"),
      ul([
        "One-to-one — each side has exactly one of the other; used for security, performance, or optional extension.",
        "One-to-many — the common case; a customer has many orders.",
        "Many-to-many — resolved with a junction entity (order lines between orders and products).",
      ]),
      h("Explicit vs. inferred"),
      p("Explicit relationships are declared and enforced — use them where correctness is load-bearing. Inferred relationships are computed (similarity, co-occurrence) — powerful for discovery, but probabilistic; never treat a 0.92 similarity as a foreign key. In semi-structured data, choose deliberately whether to embed or reference. See [[Grain]] for how joins change what a row means."),
    ],
  },
  {
    title: "Grain",
    slug: "grain",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("Grain answers one question: what does a single row represent? One row per order, per order line, per customer per day. It is the most consequential and most skipped decision in a model, and it underlies [[Counting & aggregation]]."),
      h("Get it right early"),
      ul([
        "Define the grain before you build, and write it down.",
        "Choose the finest practical grain — you can always aggregate up, but you can never recover detail you threw away.",
        "Watch for fan-out — joining tables at different grains silently multiplies rows and inflates counts.",
      ]),
      p("taro treats grain as a headline fact on every catalog node — a model or source states its grain in plain language, right next to its definition."),
    ],
  },
  {
    title: "Counting & aggregation",
    slug: "aggregation",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("Aggregation trades detail for a summary — a count, a sum, an average. It is also a stress test: a model that cannot be aggregated cleanly has a deeper problem with [[Grain]], identity, or [[Relationships]]."),
      h("Safe aggregation"),
      ul([
        "Aligned grain — only combine things at the same grain; mismatches double-count.",
        "Disjoint groups — every row in exactly one bucket, or many-to-many overlaps inflate the total.",
        "Additivity — some measures sum across every dimension, some only across some (a balance over time), some not at all (ratios, distinct counts).",
        "Decomposability — averages are not associative; track sum and count separately and divide at the end.",
        "Boundedness — a metric is meaningless without its time and dimension scope.",
      ]),
      p("Aggregate aggressively for speed, but keep the path back to atomic data so any number can be traced and verified."),
    ],
  },
  {
    title: "Time in data modeling",
    slug: "time-in-data-modeling",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("Reality is not static, so models must handle change. The most common and most expensive bugs come from conflating different kinds of time."),
      ul([
        "Event time — when something actually happened.",
        "Ingestion time — when it reached your system.",
        "Processing time — when your system acted on it.",
        "Valid time — the period a fact was true in the real world.",
      ]),
      h("Tracking history"),
      p("Storing both valid time and the time the system recorded a fact (bitemporal modeling) lets you answer “what did we believe on this date?” — the idea behind slowly changing dimensions and point-in-time queries. For machine learning, a point-in-time (AS OF) join prevents leaking future data into training. Store timestamps in UTC with an explicit offset; never as strings. See [[Counting & aggregation]] for time-bounded metrics."),
    ],
  },
  {
    title: "Semantics & the semantic layer",
    slug: "semantics-and-the-semantic-layer",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("Meaning is mostly shared meaning. A model's job is to capture what terms mean in a way people and machines can agree on. In taro, Concept pages are the semantic layer — a term is defined once and everything points at that definition."),
      h("From vocabulary to structure"),
      ul([
        "A controlled vocabulary fixes one preferred term and maps synonyms to it.",
        "A taxonomy organizes terms into a hierarchy (Phones under Electronics).",
        "An ontology adds the rules and relationships a machine can reason over.",
        "Metadata — technical, business, and semantic — is the context that makes all of it usable.",
      ]),
      p("This is what grounds an AI agent: with explicit definitions it follows your meaning of “customer” instead of guessing. See [[ML / AI integration]] and [[Why data modeling matters]]."),
    ],
  },
  {
    title: "Perspectives on a model",
    slug: "perspectives-on-a-model",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("The same business reality is modeled differently depending on who consumes it. None of these perspectives is the whole truth; a good modeler moves between them and keeps them coherent through shared identity and definitions."),
      ul([
        "Operational — normalized tables with constraints, optimized for consistent reads and writes.",
        "Analytical — facts and dimensions, denormalized for query speed and history.",
        "Application — documents and events shaped around access patterns and velocity.",
        "Machine learning — features and embeddings, where relationships are distances and probabilities.",
        "Knowledge — nodes and typed edges that carry meaning a system can reason over.",
      ]),
      p("One customer is a row, a dimension, a document, a feature vector, and a graph node at once. The skill is recognizing which perspective a problem calls for. See [[Entities, instances & identifiers]] and [[Modeling theory]]."),
    ],
  },
  {
    title: "Seeing the business",
    slug: "seeing-the-business",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("You model the business, not just the systems. Before drawing tables, understand the processes that create data and the domains that give it meaning."),
      ul([
        "A business process is the horizontal flow of work — an event triggers steps that change a core object and produce an outcome.",
        "A domain is a boundary of meaning — a place where words, rules, and ownership are consistent.",
      ]),
      h("Shared language"),
      p("The same word can mean different things across domains: an “order” is a signed deal to sales, a pick list to fulfillment, a refund reference to returns. Agree on a shared vocabulary, or model the translation between domains explicitly."),
      h("Context collapse"),
      p("Flattening who, what, when, and why — dumping events into one table, collapsing timestamps into a single “date” — erases the context that made data meaningful. Preserving it with metadata is what keeps a model trustworthy. See [[Semantics & the semantic layer]] and [[Time in data modeling]]."),
    ],
  },
  {
    title: "Data modeling as continuous practice",
    slug: "data-modeling-as-practice",
    kind: "concept",
    parent: "data-modeling",
    body: [
      p("A data model is a living reflection of the business, not a one-time project. As the business changes, the model has to change with it — treat it as an ongoing program."),
      h("Just-in-time modeling"),
      p("Model to the question in front of you, ship a thin slice, and harden it — tests, docs, refactor — only once it becomes load-bearing. Moving slowly to move fast beats both big-design-up-front and throwing data in a pile."),
      h("Smells to watch for"),
      ul([
        "Inconsistent or cryptic names; reserved words.",
        "Redundant data duplicated across tables.",
        "Repeated columns (PO_1, PO_2, PO_3) that should be rows.",
        "Overloaded tables stuffed with unrelated entities.",
        "Dogmatically applying one approach where it does not fit.",
      ]),
      p("See [[Why data modeling matters]] for the debt these create, and [[Grain]] and [[Counting & aggregation]] for where they bite hardest."),
    ],
  },
];

/* ---- emit SQL ------------------------------------------------------------ */

const T = "$taro$"; // dollar-quote tag; appears in no title/slug/content.
const q = (s) => `${T}${s}${T}`;
const slugs = pages.map((p) => p.slug);
const arr = (xs) => `array[${xs.map((s) => q(s)).join(", ")}]`;

const values = pages
  .map(
    (pg) =>
      `  (${q(pg.title)}, ${q(pg.slug)}, ${q(pg.kind)}, ${q("viewer")}, ${q(
        JSON.stringify(doc(pg.body)),
      )}::jsonb)`,
  )
  .join(",\n");

const childSlugs = pages.filter((p) => p.parent).map((p) => p.slug);

const out = `-- ============================================================================
-- taro — wiki seed: data-modeling reference pages (generated).
--   Generated by supabase/seed-wiki.mjs — edit there, not here.
--   node supabase/seed-wiki.mjs > supabase/seed_wiki.sql
-- Idempotent: upserts pages by slug, re-derives page→page links from the
-- embedded [[wikilinks]]. Run with the service role (RLS-bypassing).
-- ============================================================================

insert into public.pages (title, slug, kind, visibility, content) values
${values}
on conflict (slug) do update set
  title = excluded.title,
  kind = excluded.kind,
  visibility = excluded.visibility,
  content = excluded.content,
  updated_at = now();

-- Parent the building-block pages under the "Data modeling" index.
update public.pages c
  set parent_id = p.id
  from public.pages p
  where p.slug = ${q("data-modeling")}
    and c.slug = any(${arr(childSlugs)});

-- Re-derive page→page links straight from the embedded wikilinks, so the
-- backlink graph matches the prose. Clear the seeded sources first for clean
-- re-runs, then resolve each [[Title]] to its page by (case-insensitive) title.
delete from public.links
  where source_type = 'page' and target_type = 'page'
    and source_id in (select id from public.pages where slug = any(${arr(slugs)}));

insert into public.links (source_type, source_id, target_type, target_id)
select distinct 'page'::node_type, s.id, 'page'::node_type, t.id
  from public.pages s
  cross join lateral
    jsonb_path_query(s.content, '$.**?(@.type == "wikilink").attrs.title') as wl(val)
  join public.pages t on lower(t.title) = lower(wl.val #>> '{}')
  where s.slug = any(${arr(slugs)})
    and t.id <> s.id
on conflict do nothing;
`;

process.stdout.write(out);
