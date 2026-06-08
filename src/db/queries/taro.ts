import "server-only";

import { asc, desc, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  columns,
  domains,
  importRuns,
  models,
  pages,
  sources,
  type Domain,
} from "@/db/schema";

export type DomainWithCounts = Pick<
  Domain,
  "id" | "name" | "slug" | "description" | "monthlyBudget" | "conceptPageId" | "position"
> & { models: number; sources: number; conceptSlug: string | null };

export type PlatformOverview = {
  models: number;
  sources: number;
  columns: number;
  byLayer: { staging: number; intermediate: number; marts: number };
  unassignedModels: number;
  lastImportAt: Date | null;
};

/** Every arm with its catalog footprint and a link to its wiki section. */
export async function listDomainsWithCounts(): Promise<DomainWithCounts[]> {
  const [domainRows, modelRows, sourceRows] = await Promise.all([
    db
      .select({
        id: domains.id,
        name: domains.name,
        slug: domains.slug,
        description: domains.description,
        monthlyBudget: domains.monthlyBudget,
        conceptPageId: domains.conceptPageId,
        position: domains.position,
      })
      .from(domains)
      .orderBy(asc(domains.position), asc(domains.name)),
    db.select({ id: models.id, domainId: models.domainId }).from(models),
    db.select({ id: sources.id, domainId: sources.domainId }).from(sources),
  ]);

  const conceptIds = domainRows
    .map((d) => d.conceptPageId)
    .filter((x): x is string => Boolean(x));
  const conceptSlugs = new Map<string, string>();
  if (conceptIds.length > 0) {
    const rows = await db
      .select({ id: pages.id, slug: pages.slug })
      .from(pages)
      .where(inArray(pages.id, conceptIds));
    for (const r of rows) conceptSlugs.set(r.id, r.slug);
  }

  const modelCount = new Map<string, number>();
  for (const m of modelRows)
    if (m.domainId) modelCount.set(m.domainId, (modelCount.get(m.domainId) ?? 0) + 1);
  const sourceCount = new Map<string, number>();
  for (const s of sourceRows)
    if (s.domainId) sourceCount.set(s.domainId, (sourceCount.get(s.domainId) ?? 0) + 1);

  return domainRows.map((d) => ({
    ...d,
    models: modelCount.get(d.id) ?? 0,
    sources: sourceCount.get(d.id) ?? 0,
    conceptSlug: d.conceptPageId ? conceptSlugs.get(d.conceptPageId) ?? null : null,
  }));
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const [modelRows, sourceRows, colRow, lastImport] = await Promise.all([
    db.select({ id: models.id, layer: models.layer, domainId: models.domainId }).from(models),
    db.select({ id: sources.id }).from(sources),
    db.select({ n: sql<number>`count(*)::int` }).from(columns),
    db
      .select({ importedAt: importRuns.importedAt })
      .from(importRuns)
      .orderBy(desc(importRuns.importedAt))
      .limit(1),
  ]);

  const byLayer = { staging: 0, intermediate: 0, marts: 0 };
  let unassignedModels = 0;
  for (const m of modelRows) {
    byLayer[m.layer] += 1;
    if (!m.domainId) unassignedModels++;
  }

  return {
    models: modelRows.length,
    sources: sourceRows.length,
    columns: colRow[0]?.n ?? 0,
    byLayer,
    unassignedModels,
    lastImportAt: lastImport[0]?.importedAt ?? null,
  };
}
