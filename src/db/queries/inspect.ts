import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { domains, models } from "@/db/schema";
import { analyzeSql, type SqlIssue } from "@/lib/sql/analyze";
import { recommend, type DecompositionPlan } from "@/lib/sql/decompose";
import { getMetricRegistry } from "@/db/queries/metrics";

export type ModelInspection = {
  id: string;
  name: string;
  layer: "staging" | "intermediate" | "marts" | null;
  domainName: string | null;
  description: string | null;
  sql: string | null;
  issues: SqlIssue[];
  plan: DecompositionPlan | null;
};

/** Inspect one model's SQL: detect smells and produce a decomposition plan. */
export async function getModelInspection(id: string): Promise<ModelInspection | null> {
  const [m] = await db
    .select({
      id: models.id,
      name: models.name,
      layer: models.layer,
      description: models.description,
      sql: models.sql,
      domainName: domains.name,
    })
    .from(models)
    .leftJoin(domains, eq(domains.id, models.domainId))
    .where(eq(models.id, id))
    .limit(1);
  if (!m) return null;

  const ctx = { name: m.name, layer: m.layer, sql: m.sql ?? "" };
  const registry = await getMetricRegistry();
  const issues = m.sql ? analyzeSql(ctx, registry) : [];
  const plan = m.sql && issues.length > 0 ? recommend(issues, ctx) : null;

  return {
    id: m.id,
    name: m.name,
    layer: m.layer,
    domainName: m.domainName,
    description: m.description,
    sql: m.sql,
    issues,
    plan,
  };
}
