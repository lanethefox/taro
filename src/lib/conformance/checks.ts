/**
 * The conformance rubric — the dbt_project_evaluator idea applied to taro's own
 * catalog and wired to taro's own wiki. Each check is a deterministic predicate
 * over a normalized node and maps to a principle page (by title) so a failure
 * links to "how to fix it". Pure and dependency-free (smoke-testable).
 */

export type CheckStatus = "pass" | "fail" | "warn" | "na";
export type AppliesTo = "model" | "source" | "both";

export type ConformanceColumn = {
  name: string;
  isPk: boolean;
  isFk: boolean;
  tests: string[];
  description: string | null;
};

export type ConformanceNode = {
  type: "model" | "source";
  id: string;
  name: string;
  layer: "staging" | "intermediate" | "marts" | null;
  materialization: string | null;
  grain: string | null;
  description: string | null;
  domainId: string | null;
  freshnessSla: string | null;
  columns: ConformanceColumn[];
  /** Materializations of this model's upstream models (for view-chain detection). */
  upstreamMaterializations: string[];
  upstreamCount: number;
  downstreamCount: number;
  conceptLinks: number;
  decisionLinks: number;
};

export type CheckDef = {
  key: string;
  title: string;
  description: string;
  appliesTo: AppliesTo;
  severity: "error" | "warn";
  weight: number;
  principleTitle: string | null;
  /** Returns pass/fail (or warn for soft checks). `na` is derived from appliesTo. */
  evaluate: (n: ConformanceNode) => boolean;
};

const has = (s: string | null | undefined): boolean => Boolean(s && s.trim().length > 0);

export const CHECKS: CheckDef[] = [
  {
    key: "grain",
    title: "Grain defined",
    description: "The node declares its grain — what one row means.",
    appliesTo: "both",
    severity: "error",
    weight: 2,
    principleTitle: "Grain",
    evaluate: (n) => has(n.grain),
  },
  {
    key: "owned",
    title: "Owned",
    description: "Assigned to an arm of the business (a cost center).",
    appliesTo: "both",
    severity: "error",
    weight: 1,
    principleTitle: "Who owns the dbt project",
    evaluate: (n) => Boolean(n.domainId),
  },
  {
    key: "documented",
    title: "Documented",
    description: "Has a description.",
    appliesTo: "both",
    severity: "error",
    weight: 1,
    principleTitle: "Auditing a dbt project",
    evaluate: (n) => has(n.description),
  },
  {
    key: "has_pk",
    title: "Has a primary key",
    description: "At least one column is marked primary key.",
    appliesTo: "model",
    severity: "error",
    weight: 2,
    principleTitle: "Entities, instances & identifiers",
    evaluate: (n) => n.columns.some((c) => c.isPk),
  },
  {
    key: "pk_tested",
    title: "Primary key tested",
    description: "The primary key carries not_null and unique tests.",
    appliesTo: "model",
    severity: "error",
    weight: 1,
    principleTitle: "Testing & data quality",
    evaluate: (n) => {
      const pk = n.columns.find((c) => c.isPk);
      return Boolean(pk && pk.tests.includes("not_null") && pk.tests.includes("unique"));
    },
  },
  {
    key: "tested",
    title: "Tested",
    description: "At least one column carries a test.",
    appliesTo: "model",
    severity: "error",
    weight: 1,
    principleTitle: "Testing & data quality",
    evaluate: (n) => n.columns.some((c) => c.tests.length > 0),
  },
  {
    key: "linked_concept",
    title: "Linked to a concept",
    description: "Connected to a wiki concept — its semantics are explicit.",
    appliesTo: "both",
    severity: "error",
    weight: 1,
    principleTitle: "Semantics & the semantic layer",
    evaluate: (n) => n.conceptLinks > 0,
  },
  {
    key: "has_why",
    title: "Has the why",
    description: "Linked to a decision that shaped it.",
    appliesTo: "both",
    severity: "warn",
    weight: 1,
    principleTitle: "Auditing a dbt project",
    evaluate: (n) => n.decisionLinks > 0,
  },
  {
    key: "in_lineage",
    title: "In the lineage",
    description: "Connected to the DAG — not an orphan.",
    appliesTo: "model",
    severity: "error",
    weight: 1,
    principleTitle: "dbt sprawl and the missing core",
    evaluate: (n) => n.upstreamCount + n.downstreamCount > 0,
  },
  {
    key: "layering",
    title: "Layering",
    description: "Staging reads sources (no model parents); marts build on models.",
    appliesTo: "model",
    severity: "warn",
    weight: 1,
    principleTitle: "dbt anti-patterns",
    evaluate: (n) => {
      if (n.layer === "staging") return n.upstreamCount === 0;
      if (n.layer === "marts") return n.upstreamCount > 0;
      return true;
    },
  },
  {
    key: "no_view_chain",
    title: "No view-on-view chain",
    description: "A view doesn't stack on another view.",
    appliesTo: "model",
    severity: "warn",
    weight: 1,
    principleTitle: "dbt anti-patterns",
    evaluate: (n) =>
      !(n.materialization === "view" && n.upstreamMaterializations.includes("view")),
  },
  {
    key: "freshness",
    title: "Freshness SLA",
    description: "Declares a freshness expectation.",
    appliesTo: "both",
    severity: "warn",
    weight: 1,
    principleTitle: "Data observability",
    evaluate: (n) => has(n.freshnessSla),
  },
];

function applies(check: CheckDef, type: "model" | "source"): boolean {
  return check.appliesTo === "both" || check.appliesTo === type;
}

export type CheckResult = { key: string; status: CheckStatus };

/** Run every check against a node. Inapplicable checks return `na`. */
export function evaluateNode(node: ConformanceNode): CheckResult[] {
  return CHECKS.map((check) => {
    if (!applies(check, node.type)) return { key: check.key, status: "na" as const };
    const ok = check.evaluate(node);
    if (ok) return { key: check.key, status: "pass" as const };
    return { key: check.key, status: check.severity === "warn" ? "warn" : "fail" };
  });
}
