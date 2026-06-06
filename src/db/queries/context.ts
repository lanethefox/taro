import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { columns, models, pages, sources, type Column } from "@/db/schema";
import { listRelationships } from "@/db/queries/erd";
import { excerpt, type JSONContent } from "@/lib/content";

type Vis = "private" | "viewer" | "public";

function colTests(c: Column): string[] {
  return Array.isArray(c.tests)
    ? (c.tests as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
}

/**
 * The machine-readable context bundle (BUILD-PLAN M4 north star): definitions +
 * grain + structure + relationships as one JSON document, so an agent/LLM can
 * consume taro's meaning without scraping pages. Visibility-filtered.
 */
export async function getContextBundle(owner: boolean) {
  const show = (v: Vis) => owner || v !== "private";

  const [conceptRows, modelRows, sourceRows, colRows, rels] = await Promise.all([
    db
      .select({
        title: pages.title,
        slug: pages.slug,
        content: pages.content,
        visibility: pages.visibility,
      })
      .from(pages)
      .where(eq(pages.kind, "concept"))
      .orderBy(asc(pages.title)),
    db.select().from(models).orderBy(asc(models.name)),
    db.select().from(sources).orderBy(asc(sources.name)),
    db.select().from(columns),
    listRelationships(),
  ]);

  const colsByParent = new Map<string, Column[]>();
  for (const c of colRows) {
    const k = `${c.parentType}:${c.parentId}`;
    (colsByParent.get(k) ?? colsByParent.set(k, []).get(k)!).push(c);
  }
  const colsFor = (type: "model" | "source", id: string) =>
    (colsByParent.get(`${type}:${id}`) ?? [])
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
      .map((c) => ({
        name: c.name,
        dataType: c.dataType,
        description: c.description,
        isPk: c.isPk,
        isFk: c.isFk,
        tests: colTests(c),
      }));

  const visibleModelIds = new Set(
    modelRows.filter((m) => show(m.visibility)).map((m) => m.id),
  );

  return {
    generatedAt: new Date().toISOString(),
    concepts: conceptRows
      .filter((c) => show(c.visibility))
      .map((c) => ({
        term: c.title,
        slug: c.slug,
        definition: excerpt(c.content as JSONContent | null, 800),
      })),
    sources: sourceRows
      .filter((s) => show(s.visibility))
      .map((s) => ({
        name: s.name,
        system: s.system,
        grain: s.grain,
        description: s.description,
        columns: colsFor("source", s.id),
      })),
    models: modelRows
      .filter((m) => show(m.visibility))
      .map((m) => ({
        name: m.name,
        layer: m.layer,
        materialization: m.materialization,
        grain: m.grain,
        description: m.description,
        columns: colsFor("model", m.id),
      })),
    relationships: rels
      .filter(
        (r) => visibleModelIds.has(r.fromModelId) && visibleModelIds.has(r.toModelId),
      )
      .map((r) => ({
        from: { model: r.fromModelName, column: r.fromColumnName },
        to: { model: r.toModelName, column: r.toColumnName },
        cardinality: r.cardinality,
      })),
  };
}
