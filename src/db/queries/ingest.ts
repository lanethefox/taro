import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  columns,
  costUsage,
  domains,
  importRuns,
  modelDependencies,
  models,
  relationships,
  sources,
} from "@/db/schema";
import type { ParsedImport } from "@/lib/ingest/dbt";
import { reconcileColumns } from "@/db/queries/catalog";

export type ImportSummary = {
  models: { created: number; updated: number };
  sources: { created: number; updated: number };
  columns: number;
  dependencies: number;
  relationships: number;
  usagePeriods: number;
  dryRun: boolean;
};

/** First day of the current month, as a `date` string (the usage period key). */
function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Apply a parsed dbt import to the catalog. Upsert is keyed by `dbtUniqueId`
 * with a fallback to matching an existing row by name, so the first import
 * against a hand-curated catalog updates rows in place instead of duplicating.
 * `dryRun` computes the create/update counts without writing.
 */
export async function applyImport(
  parsed: ParsedImport,
  opts: { importerId?: string | null; dryRun?: boolean } = {},
): Promise<ImportSummary> {
  const dryRun = opts.dryRun ?? false;

  const [existingModels, existingSources, domainRows] = await Promise.all([
    db.select({ id: models.id, name: models.name, dbtUniqueId: models.dbtUniqueId }).from(models),
    db.select({ id: sources.id, name: sources.name, dbtUniqueId: sources.dbtUniqueId }).from(sources),
    db.select({ id: domains.id, slug: domains.slug }).from(domains),
  ]);

  const domainBySlug = new Map(domainRows.map((d) => [d.slug, d.id]));
  const mUid = new Map(existingModels.filter((r) => r.dbtUniqueId).map((r) => [r.dbtUniqueId!, r.id]));
  const mName = new Map(existingModels.map((r) => [r.name, r.id]));
  const sUid = new Map(existingSources.filter((r) => r.dbtUniqueId).map((r) => [r.dbtUniqueId!, r.id]));
  const sName = new Map(existingSources.map((r) => [r.name, r.id]));

  const summary: ImportSummary = {
    models: { created: 0, updated: 0 },
    sources: { created: 0, updated: 0 },
    columns: 0,
    dependencies: 0,
    relationships: 0,
    usagePeriods: 0,
    dryRun,
  };

  // Maps from dbt unique_id -> taro row id, filled as we upsert.
  const modelIdByUid = new Map<string, string>();
  const sourceIdByUid = new Map<string, string>();

  /* ----- Sources ----- */
  for (const s of parsed.sources) {
    const domainId = s.domainKey ? domainBySlug.get(s.domainKey) ?? null : null;
    const existingId = sUid.get(s.dbtUniqueId) ?? sName.get(s.name);
    if (existingId) {
      summary.sources.updated++;
      if (!dryRun) {
        await db
          .update(sources)
          .set({
            name: s.name,
            description: s.description,
            system: s.system,
            grain: s.grain,
            dbtUniqueId: s.dbtUniqueId,
            ...(domainId ? { domainId } : {}),
            updatedAt: new Date(),
          })
          .where(eq(sources.id, existingId));
      }
      sourceIdByUid.set(s.dbtUniqueId, existingId);
    } else {
      summary.sources.created++;
      if (!dryRun) {
        const [row] = await db
          .insert(sources)
          .values({
            name: s.name,
            description: s.description,
            system: s.system,
            grain: s.grain,
            dbtUniqueId: s.dbtUniqueId,
            domainId,
          })
          .returning({ id: sources.id });
        sourceIdByUid.set(s.dbtUniqueId, row.id);
      }
    }
  }

  /* ----- Models ----- */
  for (const m of parsed.models) {
    const domainId = m.domainKey ? domainBySlug.get(m.domainKey) ?? null : null;
    const existingId = mUid.get(m.dbtUniqueId) ?? mName.get(m.name);
    if (existingId) {
      summary.models.updated++;
      if (!dryRun) {
        await db
          .update(models)
          .set({
            name: m.name,
            description: m.description,
            layer: m.layer,
            materialization: m.materialization,
            grain: m.grain,
            dbtUniqueId: m.dbtUniqueId,
            ...(domainId ? { domainId } : {}),
            updatedAt: new Date(),
          })
          .where(eq(models.id, existingId));
      }
      modelIdByUid.set(m.dbtUniqueId, existingId);
    } else {
      summary.models.created++;
      if (!dryRun) {
        const [row] = await db
          .insert(models)
          .values({
            name: m.name,
            description: m.description,
            layer: m.layer,
            materialization: m.materialization,
            grain: m.grain,
            dbtUniqueId: m.dbtUniqueId,
            domainId,
          })
          .returning({ id: models.id });
        modelIdByUid.set(m.dbtUniqueId, row.id);
      }
    }
  }

  // Count columns regardless of dry run (the diff the user previews).
  for (const m of parsed.models) summary.columns += m.columns.length;
  for (const s of parsed.sources) summary.columns += s.columns.length;

  // Resolved lineage / relationship / usage counts (for the preview too).
  const importedModelUids = new Set(parsed.models.map((m) => m.dbtUniqueId));
  const deps = parsed.models.flatMap((m) =>
    m.dependsOn
      .filter((d) => importedModelUids.has(d))
      .map((d) => ({ upstream: d, downstream: m.dbtUniqueId })),
  );
  summary.dependencies = deps.length;
  summary.relationships = parsed.relationships.length;
  const usageNodes = [...parsed.models, ...parsed.sources].filter(
    (n) => n.runSeconds !== null,
  );
  summary.usagePeriods = usageNodes.length;

  if (dryRun) return summary;

  /* ----- Columns ----- */
  for (const m of parsed.models) {
    const id = modelIdByUid.get(m.dbtUniqueId);
    if (id) await reconcileColumns("model", id, m.columns);
  }
  for (const s of parsed.sources) {
    const id = sourceIdByUid.get(s.dbtUniqueId);
    if (id) await reconcileColumns("source", id, s.columns);
  }

  /* ----- Lineage (rebuild edges for the imported models) ----- */
  const downstreamIds = parsed.models
    .map((m) => modelIdByUid.get(m.dbtUniqueId))
    .filter((x): x is string => Boolean(x));
  if (downstreamIds.length > 0) {
    await db
      .delete(modelDependencies)
      .where(inArray(modelDependencies.downstreamId, downstreamIds));
    const edges = deps
      .map((e) => ({
        upstreamId: modelIdByUid.get(e.upstream),
        downstreamId: modelIdByUid.get(e.downstream),
      }))
      .filter((e): e is { upstreamId: string; downstreamId: string } =>
        Boolean(e.upstreamId && e.downstreamId && e.upstreamId !== e.downstreamId),
      );
    if (edges.length > 0)
      await db.insert(modelDependencies).values(edges).onConflictDoNothing();
  }

  /* ----- Relationships (best-effort, resolved both ends) ----- */
  let relCreated = 0;
  for (const r of parsed.relationships) {
    const fromModelId = modelIdByUid.get(r.fromModel);
    const toModelId = modelIdByUid.get(r.toModel);
    if (!fromModelId || !toModelId) continue;
    const [fromCol] = await db
      .select({ id: columns.id })
      .from(columns)
      .where(
        and(
          eq(columns.parentType, "model"),
          eq(columns.parentId, fromModelId),
          eq(columns.name, r.fromColumn),
        ),
      )
      .limit(1);
    const [toCol] = await db
      .select({ id: columns.id })
      .from(columns)
      .where(
        and(
          eq(columns.parentType, "model"),
          eq(columns.parentId, toModelId),
          eq(columns.name, r.toColumn),
        ),
      )
      .limit(1);
    await db
      .insert(relationships)
      .values({
        fromModelId,
        fromColumnId: fromCol?.id ?? null,
        toModelId,
        toColumnId: toCol?.id ?? null,
        cardinality: "one_to_many",
      });
    relCreated++;
  }
  summary.relationships = relCreated;

  /* ----- Usage (run_results seconds → cost_usage for this period) ----- */
  const period = currentPeriod();
  let usageWritten = 0;
  for (const m of parsed.models) {
    const id = modelIdByUid.get(m.dbtUniqueId);
    if (!id || m.runSeconds === null) continue;
    await writeUsage("model", id, period, m.runSeconds);
    usageWritten++;
  }
  for (const s of parsed.sources) {
    const id = sourceIdByUid.get(s.dbtUniqueId);
    if (!id || s.runSeconds === null) continue;
    await writeUsage("source", id, period, s.runSeconds);
    usageWritten++;
  }
  summary.usagePeriods = usageWritten;

  await db.insert(importRuns).values({
    fileNames: null,
    counts: summary,
    importerId: opts.importerId ?? null,
  });

  return summary;
}

async function writeUsage(
  nodeType: "model" | "source",
  nodeId: string,
  period: string,
  seconds: number,
): Promise<void> {
  await db
    .insert(costUsage)
    .values({
      nodeType,
      nodeId,
      period,
      units: String(seconds),
      source: "run_results",
    })
    .onConflictDoUpdate({
      target: [costUsage.nodeType, costUsage.nodeId, costUsage.period],
      set: { units: String(seconds), source: "run_results", updatedAt: new Date() },
    });
}
