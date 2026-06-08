import "server-only";

import { asc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { domains, metrics, models } from "@/db/schema";
import { analyzeSql, type MetricRef } from "@/lib/sql/analyze";

function safeRegex(src: string): RegExp | null {
  try {
    return new RegExp(src, "i");
  } catch {
    return null;
  }
}

/** The semantic layer as a detection registry for the SQL analyzer. */
export async function getMetricRegistry(): Promise<MetricRef[]> {
  const rows = await db
    .select({ name: metrics.name, detect: metrics.detect, owner: models.name })
    .from(metrics)
    .leftJoin(models, eq(models.id, metrics.modelId));
  const out: MetricRef[] = [];
  for (const r of rows) {
    if (!r.detect || !r.owner) continue;
    const re = safeRegex(r.detect);
    if (re) out.push({ name: r.name, owner: r.owner, patterns: [re] });
  }
  return out;
}

export type SemanticMetric = {
  id: string;
  name: string;
  label: string | null;
  type: "simple" | "ratio" | "derived" | "cumulative";
  expression: string | null;
  window: string | null;
  modelName: string | null;
  domainName: string | null;
  numeratorName: string | null;
  denominatorName: string | null;
  /** Models (with SQL) that recompute this metric instead of referencing it. */
  recomputedBy: string[];
};

export type SemanticLayer = { metrics: SemanticMetric[]; driftCount: number };

/** The governed semantic layer: every metric, its definition, and where it drifts. */
export async function getSemanticLayer(
  opts: { includePrivate?: boolean } = {},
): Promise<SemanticLayer> {
  const includePrivate = opts.includePrivate ?? false;
  const rows = await db
    .select({
      id: metrics.id,
      name: metrics.name,
      label: metrics.label,
      type: metrics.type,
      expression: metrics.expression,
      detect: metrics.detect,
      window: metrics.window,
      numeratorId: metrics.numeratorId,
      denominatorId: metrics.denominatorId,
      visibility: metrics.visibility,
      modelName: models.name,
      domainName: domains.name,
    })
    .from(metrics)
    .leftJoin(models, eq(models.id, metrics.modelId))
    .leftJoin(domains, eq(domains.id, metrics.domainId))
    .orderBy(asc(domains.name), asc(metrics.name));

  const visible = includePrivate ? rows : rows.filter((r) => r.visibility !== "private");
  const nameById = new Map(rows.map((r) => [r.id, r.name]));

  // Build the registry and find drift across models that have SQL.
  const registry: MetricRef[] = [];
  for (const r of visible) {
    if (!r.detect || !r.modelName) continue;
    const re = safeRegex(r.detect);
    if (re) registry.push({ name: r.name, owner: r.modelName, patterns: [re] });
  }
  const sqlModels = await db
    .select({ name: models.name, layer: models.layer, sql: models.sql, visibility: models.visibility })
    .from(models)
    .where(isNotNull(models.sql));
  const visSqlModels = includePrivate
    ? sqlModels
    : sqlModels.filter((m) => m.visibility !== "private");

  const recomputed = new Map<string, Set<string>>();
  for (const mdl of visSqlModels) {
    if (!mdl.sql) continue;
    for (const issue of analyzeSql({ name: mdl.name, layer: mdl.layer, sql: mdl.sql }, registry)) {
      if (issue.code === "duplicate_metric" && issue.metric) {
        const set = recomputed.get(issue.metric) ?? new Set<string>();
        set.add(mdl.name);
        recomputed.set(issue.metric, set);
      }
    }
  }

  const metricsOut: SemanticMetric[] = visible.map((r) => ({
    id: r.id,
    name: r.name,
    label: r.label,
    type: r.type,
    expression: r.expression,
    window: r.window,
    modelName: r.modelName,
    domainName: r.domainName,
    numeratorName: r.numeratorId ? nameById.get(r.numeratorId) ?? null : null,
    denominatorName: r.denominatorId ? nameById.get(r.denominatorId) ?? null : null,
    recomputedBy: [...(recomputed.get(r.name) ?? [])],
  }));

  return { metrics: metricsOut, driftCount: metricsOut.filter((m) => m.recomputedBy.length > 0).length };
}
