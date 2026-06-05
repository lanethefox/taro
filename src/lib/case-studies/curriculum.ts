import type { JSONContent } from "@/lib/content";

/**
 * The default case-study curriculum (SPEC + product intent): a gap-free,
 * end-to-end picture of what a staff analytics engineer covers when standing up
 * a startup's analytics — across a technical track and a business/stakeholder
 * track. Seeded into every new case study; editable afterwards.
 *
 * `concepts` are Concept-page titles (exact) so the starter workspace links back
 * to the strategy library and shows up in those pages' backlinks.
 */
export type CurriculumItem = {
  track: "technical" | "business";
  category: string;
  title: string;
  description: string;
  concepts: string[];
  prompts: string[];
};

export const CURRICULUM: CurriculumItem[] = [
  // ---- Technical track ----
  {
    track: "technical",
    category: "Sources",
    title: "Sources & ingestion",
    description:
      "Map the raw inputs feeding the warehouse and the freshness you can expect from each.",
    concepts: ["Observation strategies"],
    prompts: [
      "List the source systems (app DB, events, third-party APIs).",
      "Note load cadence and freshness expectations per source.",
      "Flag any sources with reliability or volume risks.",
    ],
  },
  {
    track: "technical",
    category: "Staging",
    title: "Staging layer",
    description:
      "Cleaned, typed, 1:1 models over the raw sources — the foundation everything builds on.",
    concepts: ["Modeling theory"],
    prompts: [
      "Define naming + typing conventions for staging.",
      "Sketch one representative stg_ model with its columns.",
      "Decide what belongs in staging vs. downstream.",
    ],
  },
  {
    track: "technical",
    category: "Modeling",
    title: "Core modeling",
    description:
      "Choose and justify the modeling approach — dimensional, one-big-table, activity schema — and the grain of your marts.",
    concepts: ["Modeling theory"],
    prompts: [
      "Pick an approach and argue the trade-off for this scenario.",
      "Define the grain of your primary fact/marts.",
      "Identify the core dimensions and conformed keys.",
    ],
  },
  {
    track: "technical",
    category: "Materialization",
    title: "Materialization strategy",
    description:
      "Decide view vs. table vs. incremental vs. ephemeral per model, with cost/perf rationale.",
    concepts: ["Materialization strategies"],
    prompts: [
      "Classify each marts model by materialization and why.",
      "Identify candidates for incremental and the incremental key.",
      "Note the cost/latency trade-offs you're making.",
    ],
  },
  {
    track: "technical",
    category: "Quality",
    title: "Testing & data quality",
    description:
      "Define the test coverage: not_null, unique, accepted_values, relationships, and contracts.",
    concepts: ["Testing & data quality"],
    prompts: [
      "List the tests on your key models and columns.",
      "Decide what's blocking vs. warning.",
      "Define a coverage target and how you'd measure it.",
    ],
  },
  {
    track: "technical",
    category: "Observation",
    title: "Observation & monitoring",
    description:
      "Freshness SLAs, expected volume, distribution and anomaly monitoring for the models that matter.",
    concepts: ["Observation strategies"],
    prompts: [
      "Set freshness SLAs for your most-depended-on marts.",
      "Define expected volume ranges and anomaly signals.",
      "Decide where alerts go and who owns them.",
    ],
  },
  {
    track: "technical",
    category: "Orchestration",
    title: "Orchestration & scheduling",
    description:
      "Scheduling, dependency graph, backfills, environments, and CI/CD for transformations.",
    concepts: ["Orchestration strategies"],
    prompts: [
      "Define the schedule and dependency ordering.",
      "Plan backfills and idempotency.",
      "Describe the dev → CI → prod promotion flow.",
    ],
  },
  {
    track: "technical",
    category: "Lineage",
    title: "Lineage & documentation",
    description:
      "End-to-end lineage and docs so the model graph is legible to the next engineer.",
    concepts: ["Modeling theory"],
    prompts: [
      "Sketch the upstream→downstream lineage of a key mart.",
      "Decide your documentation standard (model + column).",
      "Note where lineage would catch breaking changes.",
    ],
  },
  {
    track: "technical",
    category: "ML / AI",
    title: "ML / AI hand-off",
    description:
      "How marts/features hand off to ML, plus embeddings & LLM-assisted workflows in the warehouse.",
    concepts: ["ML / AI integration"],
    prompts: [
      "Identify a feature/marts hand-off to an ML use case.",
      "Decide what (if anything) lives as embeddings in the warehouse.",
      "Note where LLM assistance helps docs or semantic search.",
    ],
  },

  // ---- Business / stakeholder track ----
  {
    track: "business",
    category: "Stakeholders",
    title: "Requirements & stakeholder map",
    description:
      "Who depends on data, what decisions they make with it, and the cadence of those conversations.",
    concepts: [],
    prompts: [
      "List stakeholder groups and the decisions they own.",
      "Capture top questions each needs answered.",
      "Define a working cadence (intake, reviews).",
    ],
  },
  {
    track: "business",
    category: "Semantics",
    title: "Metric & semantic definitions",
    description:
      "Canonical metric definitions everyone agrees on — the semantic layer that prevents drift.",
    concepts: [],
    prompts: [
      "Define 3–5 canonical metrics precisely (numerator/denominator, grain).",
      "Resolve any conflicting definitions across teams.",
      "Decide where the definitions live and how they're governed.",
    ],
  },
  {
    track: "business",
    category: "Product",
    title: "Product analytics",
    description:
      "The event model and the activation / engagement / retention questions the product org lives on.",
    concepts: [],
    prompts: [
      "Define the core event taxonomy.",
      "Pick the activation and retention metrics.",
      "Align on what 'engaged' means for this product.",
    ],
  },
  {
    track: "business",
    category: "Marketing",
    title: "Marketing analytics",
    description:
      "Acquisition, attribution, funnels, and campaign performance for the marketing team.",
    concepts: [],
    prompts: [
      "Define the acquisition funnel and stages.",
      "Decide an attribution approach and its limits.",
      "Identify the channel/campaign reporting needs.",
    ],
  },
  {
    track: "business",
    category: "Sales",
    title: "Sales analytics",
    description:
      "Pipeline, conversion, and revenue reporting that the go-to-market team can trust.",
    concepts: [],
    prompts: [
      "Model the pipeline stages and conversion.",
      "Define revenue / bookings metrics cleanly.",
      "Note the CRM ↔ warehouse reconciliation.",
    ],
  },
  {
    track: "business",
    category: "Ops",
    title: "Ops analytics",
    description:
      "Operational efficiency, capacity, and the metrics that keep the business running.",
    concepts: [],
    prompts: [
      "Identify the operational KPIs that matter.",
      "Define SLAs/efficiency measures.",
      "Note data needed to forecast capacity.",
    ],
  },
  {
    track: "business",
    category: "CX / Support",
    title: "CX & support analytics",
    description:
      "Support volume, CSAT, and the churn/health signals that connect support to the product.",
    concepts: [],
    prompts: [
      "Define support volume + resolution metrics.",
      "Link support signals to churn/health.",
      "Decide what CX feedback flows back to product.",
    ],
  },
  {
    track: "business",
    category: "Contracts",
    title: "Data contracts & SLAs",
    description:
      "Agreements with upstream producers and downstream consumers — the social layer of reliability.",
    concepts: ["Testing & data quality", "Observation strategies"],
    prompts: [
      "Define a contract with one upstream producer.",
      "Set consumer-facing SLAs for a key dataset.",
      "Decide how breaches are detected and handled.",
    ],
  },
];

/** Build a starter workspace doc for a task: prompts as a checklist + concept links. */
export function buildTaskStarterDoc(item: CurriculumItem): JSONContent {
  const content: JSONContent[] = [
    {
      type: "paragraph",
      content: [{ type: "text", text: item.description }],
    },
    {
      type: "bulletList",
      content: item.prompts.map((p) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: p }] }],
      })),
    },
  ];

  if (item.concepts.length > 0) {
    const inline: JSONContent[] = [
      { type: "text", text: "Related concepts: ", marks: [{ type: "bold" }] },
    ];
    item.concepts.forEach((title, i) => {
      if (i > 0) inline.push({ type: "text", text: " · " });
      inline.push({ type: "wikilink", attrs: { title } });
    });
    content.push({ type: "paragraph", content: inline });
  }

  return { type: "doc", content };
}
