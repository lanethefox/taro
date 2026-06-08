/**
 * The decomposition advisor (pure). Turns detected SQL smells into a concrete
 * rebuild plan that conforms to the business model — extract staging, replace a
 * recomputed metric with a ref, split a god model by grain, flatten nesting,
 * rename to convention. When the model is too tangled to decompose with
 * confidence, it returns a `needs_review` verdict and says why (the "flag it"
 * path the user asked for).
 */
import { sqlMetrics, type SqlContext, type SqlIssue } from "./analyze";

export type RecKind = "extract" | "replace" | "split" | "rename" | "enumerate" | "flatten";

export type Recommendation = {
  kind: RecKind;
  title: string;
  detail: string;
};

export type Verdict = "decomposable" | "needs_review";

export type DecompositionPlan = {
  recommendations: Recommendation[];
  verdict: Verdict;
  confidence: number;
  reason: string;
};

export function recommend(issues: SqlIssue[], ctx: SqlContext): DecompositionPlan {
  const recs: Recommendation[] = [];
  const seen = new Set<string>();
  const once = (key: string, rec: Recommendation) => {
    if (seen.has(key)) return;
    seen.add(key);
    recs.push(rec);
  };

  for (const i of issues) {
    switch (i.code) {
      case "duplicate_metric":
        recs.push({
          kind: "replace",
          title: `Reuse ${i.title.replace(/^Recomputes /, "")} instead of recomputing it`,
          detail: `Remove the local aggregate and reference ${i.owner ?? "the canonical model"} (or the semantic-layer metric) so it's defined once and can't drift.`,
        });
        break;
      case "god_model":
        once("god", {
          kind: "split",
          title: "Split by grain into intermediate models",
          detail:
            "Decompose into int_ models, each with a single clear purpose and grain; leave the mart a thin join of those conformed parts.",
        });
        break;
      case "direct_source_ref":
        once("staging", {
          kind: "extract",
          title: "Insert a staging layer",
          detail:
            "Add stg_ models for the raw inputs and ref them; a mart should never read source() directly.",
        });
        break;
      case "no_ref":
        once("refs", {
          kind: "extract",
          title: "Replace hardcoded tables with ref()/source()",
          detail:
            "Route every input through ref()/source() so lineage, environments, and tests work.",
        });
        break;
      case "select_star":
        once("enumerate", {
          kind: "enumerate",
          title: "Enumerate columns",
          detail: "Replace SELECT * with an explicit, reviewed column list.",
        });
        break;
      case "deep_nesting":
        once("flatten", {
          kind: "flatten",
          title: "Flatten nested subqueries",
          detail: "Lift nested SELECTs into named CTEs or their own intermediate models.",
        });
        break;
      case "nonstandard_naming":
        once("rename", {
          kind: "rename",
          title: "Rename to the layer convention",
          detail: i.detail,
        });
        break;
    }
  }

  // Verdict: can we decompose with confidence, or should a human review it?
  const m = sqlMetrics(ctx.sql);
  const complexity = m.joins + m.ctes + m.subqueries;
  const dupCount = issues.filter((i) => i.code === "duplicate_metric").length;
  const god = issues.some((i) => i.code === "god_model");
  const deep = issues.some((i) => i.code === "deep_nesting");

  const tooTangled =
    (god && deep && dupCount >= 2) || complexity >= 18 || issues.length >= 6;

  if (tooTangled) {
    return {
      recommendations: recs,
      verdict: "needs_review",
      confidence: 40,
      reason:
        "High complexity combined with multiple recomputed metrics — the rebuild isn't a mechanical decomposition. Flag for an engineer to split and reconcile the metrics by hand.",
    };
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const confidence = Math.max(55, 95 - errors * 8 - (issues.length - errors) * 3);
  return {
    recommendations: recs,
    verdict: "decomposable",
    confidence,
    reason:
      "Every smell maps to a known rebuild step; this model can be decomposed into conforming parts.",
  };
}
