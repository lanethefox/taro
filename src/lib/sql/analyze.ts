/**
 * Heuristic SQL smell detector (pure, dependency-free, smoke-testable). It scans
 * a model's SQL body for the legacy anti-patterns the decomposition advisor knows
 * how to fix: bloat (god model), recomputed metrics, direct source reads, no
 * dbt refs, SELECT *, deep nesting, and nonstandard naming. Deliberately
 * conservative — it reads code, it doesn't execute it.
 */
import { CANONICAL_METRICS } from "./metrics";

export type IssueCode =
  | "god_model"
  | "duplicate_metric"
  | "direct_source_ref"
  | "no_ref"
  | "select_star"
  | "deep_nesting"
  | "nonstandard_naming";

export type Severity = "error" | "warn";

export type SqlIssue = {
  code: IssueCode;
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
  metric?: string;
  owner?: string;
};

export type SqlContext = {
  name: string;
  layer: "staging" | "intermediate" | "marts" | null;
  sql: string;
};

export type SqlMetrics = {
  joins: number;
  ctes: number;
  lines: number;
  subqueries: number;
};

const LAYER_PREFIXES: Record<string, string[]> = {
  staging: ["stg_", "base_"],
  intermediate: ["int_"],
  marts: ["dim_", "fct_", "fact_", "mart_", "agg_", "bridge_", "wbr_", "rpt_"],
};

/** Strip block/line comments and string literals so they don't trip patterns. */
function strip(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

function count(re: RegExp, s: string): number {
  return (s.match(re) ?? []).length;
}

export function sqlMetrics(sql: string): SqlMetrics {
  const s = strip(sql);
  return {
    joins: count(/\bjoin\b/gi, s),
    // CTE definitions: `name as (` (the leading `with` or a comma precedes them).
    ctes: count(/(?:\bwith\b|,)\s*[\w"]+\s+as\s*\(/gi, s),
    lines: sql.split("\n").length,
    subqueries: count(/\(\s*select\b/gi, s),
  };
}

export function analyzeSql(ctx: SqlContext): SqlIssue[] {
  const issues: SqlIssue[] = [];
  const sql = ctx.sql ?? "";
  if (sql.trim().length === 0) return issues;
  const s = strip(sql);
  const m = sqlMetrics(sql);

  // God model — too much in one place.
  if (m.joins >= 6 || m.ctes >= 8 || m.lines >= 120) {
    issues.push({
      code: "god_model",
      severity: "error",
      title: "God model",
      detail: `One model doing too much: ${m.joins} joins, ${m.ctes} CTEs, ${m.lines} lines.`,
      evidence: `${m.joins} joins · ${m.ctes} CTEs · ${m.lines} lines`,
    });
  }

  // Recomputed canonical metrics.
  for (const metric of CANONICAL_METRICS) {
    if (ctx.name === metric.owner) continue;
    const hit = metric.patterns.find((p) => p.test(s));
    if (hit) {
      issues.push({
        code: "duplicate_metric",
        severity: "error",
        title: `Recomputes ${metric.label}`,
        detail: `${metric.label} should be defined once in ${metric.owner}; this model recomputes it.`,
        evidence: hit.source,
        metric: metric.key,
        owner: metric.owner,
      });
    }
  }

  const usesRef = /\bref\s*\(/i.test(s) || /\{\{\s*ref/i.test(s);
  const usesSource = /\bsource\s*\(/i.test(s) || /\{\{\s*source/i.test(s);
  const hardcoded = /\bfrom\s+[a-z_][\w]*\.[a-z_][\w]*(?:\.[a-z_][\w]*)?/i.test(s);

  // Mart reading a source directly.
  if (ctx.layer === "marts" && usesSource) {
    issues.push({
      code: "direct_source_ref",
      severity: "error",
      title: "Mart reads a source directly",
      detail: "Marts should build on staging/intermediate models, never read raw sources.",
    });
  }

  // No dbt refs at all — hardcoded table names.
  if (!usesRef && !usesSource && hardcoded) {
    issues.push({
      code: "no_ref",
      severity: "error",
      title: "Hardcoded table references",
      detail: "Uses literal schema.table names instead of ref()/source(); breaks lineage.",
    });
  }

  // SELECT * (excludes count(*)).
  if (/\bselect\s+(?:[\w"]+\.)?\*/i.test(s)) {
    issues.push({
      code: "select_star",
      severity: "warn",
      title: "SELECT *",
      detail: "Explicit column lists prevent silent schema drift and aid pruning.",
    });
  }

  // Deep nesting.
  if (m.subqueries >= 3) {
    issues.push({
      code: "deep_nesting",
      severity: "warn",
      title: "Deeply nested subqueries",
      detail: `${m.subqueries} nested SELECTs — hard to test and reason about.`,
      evidence: `${m.subqueries} subqueries`,
    });
  }

  // Nonstandard naming for the layer.
  const prefixes = ctx.layer ? LAYER_PREFIXES[ctx.layer] : undefined;
  const lower = ctx.name === ctx.name.toLowerCase();
  const prefixOk = !prefixes || prefixes.some((p) => ctx.name.startsWith(p));
  if (!lower || !prefixOk) {
    issues.push({
      code: "nonstandard_naming",
      severity: "warn",
      title: "Nonstandard naming",
      detail: prefixes
        ? `A ${ctx.layer} model should be snake_case and start with ${prefixes.join(" / ")}.`
        : "Use lower snake_case names.",
      evidence: ctx.name,
    });
  }

  return issues;
}

export function hasBlockingIssues(issues: SqlIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
