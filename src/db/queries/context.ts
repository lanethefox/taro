import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { columns, domains, models, pages, sources, type Column } from "@/db/schema";
import { listRelationships } from "@/db/queries/erd";
import { getConformanceReport } from "@/db/queries/conformance";
import { getCostReport } from "@/db/queries/cost";
import { getSemanticLayer } from "@/db/queries/metrics";
import { excerpt, type JSONContent } from "@/lib/content";

type Vis = "private" | "viewer" | "public";

function colTests(c: Column): string[] {
  return Array.isArray(c.tests)
    ? (c.tests as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
}

/**
 * The machine-readable context bundle (BUILD-PLAN M4 north star), now governance-
 * aware: definitions + grain + structure + relationships, plus per-node arm,
 * conformance (score + open gaps), and monthly cost, and a platform governance
 * summary — so an agent knows not just the shape of the data but what's
 * trustworthy and what it costs. Visibility-filtered.
 */
export async function getContextBundle(owner: boolean) {
  const show = (v: Vis) => owner || v !== "private";

  const [conceptRows, modelRows, sourceRows, colRows, rels, domainRows, conformance, cost] =
    await Promise.all([
      db
        .select({ title: pages.title, slug: pages.slug, content: pages.content, visibility: pages.visibility })
        .from(pages)
        .where(eq(pages.kind, "concept"))
        .orderBy(asc(pages.title)),
      db.select().from(models).orderBy(asc(models.name)),
      db.select().from(sources).orderBy(asc(sources.name)),
      db.select().from(columns),
      listRelationships(),
      db.select({ id: domains.id, name: domains.name, budget: domains.monthlyBudget }).from(domains),
      getConformanceReport({ includePrivate: owner }),
      getCostReport({ includePrivate: owner }),
    ]);

  const semantic = await getSemanticLayer({ includePrivate: owner });

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

  const domainName = new Map(domainRows.map((d) => [d.id, d.name]));
  const checkTitle = new Map(conformance.checks.map((c) => [c.key, c.title]));
  const conformanceByNode = new Map(
    conformance.nodes.map((n) => [
      `${n.type}:${n.id}`,
      {
        score: n.score,
        gaps: n.results
          .filter((r) => r.status === "fail" || r.status === "warn")
          .map((r) => checkTitle.get(r.key) ?? r.key),
      },
    ]),
  );
  const costByNode = new Map(cost.nodes.map((n) => [`${n.type}:${n.id}`, n.cost]));

  const governanceFor = (type: "model" | "source", id: string, domainId: string | null) => ({
    arm: domainId ? domainName.get(domainId) ?? null : null,
    conformance: conformanceByNode.get(`${type}:${id}`) ?? null,
    monthlyCost: costByNode.get(`${type}:${id}`) ?? null,
  });

  const visibleModelIds = new Set(modelRows.filter((m) => show(m.visibility)).map((m) => m.id));

  return {
    generatedAt: new Date().toISOString(),
    governance: {
      platformConformance: conformance.platformScore,
      monthlySpend: cost.total,
      monthlyBudget: cost.totalBudget,
      arms: domainRows.map((d) => ({
        name: d.name,
        conformance: conformance.domainScores[d.id] ?? null,
        monthlySpend: cost.arms.find((a) => a.domainId === d.id)?.actual ?? 0,
        monthlyBudget: d.budget === null ? null : Number(d.budget),
      })),
    },
    concepts: conceptRows
      .filter((c) => show(c.visibility))
      .map((c) => ({
        term: c.title,
        slug: c.slug,
        definition: excerpt(c.content as JSONContent | null, 800),
      })),
    metrics: semantic.metrics.map((m) => ({
      name: m.name,
      type: m.type,
      definition:
        m.type === "ratio"
          ? `${m.numeratorName} / ${m.denominatorName}`
          : m.expression,
      model: m.modelName,
      arm: m.domainName,
    })),
    sources: sourceRows
      .filter((s) => show(s.visibility))
      .map((s) => ({
        name: s.name,
        system: s.system,
        grain: s.grain,
        description: s.description,
        ...governanceFor("source", s.id, s.domainId),
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
        ...governanceFor("model", m.id, m.domainId),
        columns: colsFor("model", m.id),
      })),
    relationships: rels
      .filter((r) => visibleModelIds.has(r.fromModelId) && visibleModelIds.has(r.toModelId))
      .map((r) => ({
        from: { model: r.fromModelName, column: r.fromColumnName },
        to: { model: r.toModelName, column: r.toColumnName },
        cardinality: r.cardinality,
      })),
  };
}
