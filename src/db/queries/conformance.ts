import "server-only";

import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { columns, links, modelDependencies, models, pages, sources } from "@/db/schema";
import {
  CHECKS,
  evaluateNode,
  type CheckResult,
  type ConformanceColumn,
  type ConformanceNode,
} from "@/lib/conformance/checks";
import { rollupScore, scoreNode, type NodeScore } from "@/lib/conformance/score";

export type ScoredNode = {
  type: "model" | "source";
  id: string;
  name: string;
  layer: "staging" | "intermediate" | "marts" | null;
  domainId: string | null;
  score: number;
  results: CheckResult[];
  counts: NodeScore;
};

export type CheckMeta = {
  key: string;
  title: string;
  description: string;
  appliesTo: "model" | "source" | "both";
  severity: "error" | "warn";
  principleSlug: string | null;
};

export type ConformanceReport = {
  platformScore: number | null;
  nodes: ScoredNode[];
  /** domainId -> mean score across that arm's nodes. */
  domainScores: Record<string, number>;
  checks: CheckMeta[];
};

function normalizeTests(tests: unknown): string[] {
  return Array.isArray(tests)
    ? tests.filter((t): t is string => typeof t === "string")
    : [];
}

/** Score every visible catalog node against the rubric. Computed on the fly. */
export async function getConformanceReport(
  opts: { includePrivate?: boolean } = {},
): Promise<ConformanceReport> {
  const includePrivate = opts.includePrivate ?? false;

  const [modelRows, sourceRows, columnRows, deps, linkRows] = await Promise.all([
    db
      .select({
        id: models.id,
        name: models.name,
        layer: models.layer,
        materialization: models.materialization,
        grain: models.grain,
        description: models.description,
        domainId: models.domainId,
        freshnessSla: models.freshnessSla,
        visibility: models.visibility,
      })
      .from(models),
    db
      .select({
        id: sources.id,
        name: sources.name,
        grain: sources.grain,
        description: sources.description,
        domainId: sources.domainId,
        freshnessSla: sources.freshnessSla,
        visibility: sources.visibility,
      })
      .from(sources),
    db
      .select({
        parentType: columns.parentType,
        parentId: columns.parentId,
        name: columns.name,
        isPk: columns.isPk,
        isFk: columns.isFk,
        tests: columns.tests,
        description: columns.description,
      })
      .from(columns),
    db
      .select({
        upstreamId: modelDependencies.upstreamId,
        downstreamId: modelDependencies.downstreamId,
      })
      .from(modelDependencies),
    db
      .select({
        sourceType: links.sourceType,
        sourceId: links.sourceId,
        targetType: links.targetType,
      })
      .from(links)
      .where(inArray(links.sourceType, ["model", "source"])),
  ]);

  const visModels = includePrivate
    ? modelRows
    : modelRows.filter((m) => m.visibility !== "private");
  const visSources = includePrivate
    ? sourceRows
    : sourceRows.filter((s) => s.visibility !== "private");

  // Columns grouped by parent.
  const colsByParent = new Map<string, ConformanceColumn[]>();
  for (const c of columnRows) {
    const key = `${c.parentType}:${c.parentId}`;
    const list = colsByParent.get(key) ?? [];
    list.push({
      name: c.name,
      isPk: c.isPk,
      isFk: c.isFk,
      tests: normalizeTests(c.tests),
      description: c.description,
    });
    colsByParent.set(key, list);
  }

  // Lineage counts + upstream materializations.
  const materializationById = new Map(visModels.map((m) => [m.id, m.materialization]));
  const upstreamCount = new Map<string, number>();
  const downstreamCount = new Map<string, number>();
  const upstreamMats = new Map<string, string[]>();
  for (const d of deps) {
    downstreamCount.set(d.upstreamId, (downstreamCount.get(d.upstreamId) ?? 0) + 1);
    upstreamCount.set(d.downstreamId, (upstreamCount.get(d.downstreamId) ?? 0) + 1);
    const mat = materializationById.get(d.upstreamId);
    if (mat) {
      const list = upstreamMats.get(d.downstreamId) ?? [];
      list.push(mat);
      upstreamMats.set(d.downstreamId, list);
    }
  }

  // Link counts: page targets = concepts, post targets = decisions.
  const conceptLinks = new Map<string, number>();
  const decisionLinks = new Map<string, number>();
  for (const l of linkRows) {
    const key = `${l.sourceType}:${l.sourceId}`;
    if (l.targetType === "page")
      conceptLinks.set(key, (conceptLinks.get(key) ?? 0) + 1);
    else if (l.targetType === "post")
      decisionLinks.set(key, (decisionLinks.get(key) ?? 0) + 1);
  }

  const nodes: ScoredNode[] = [];

  for (const m of visModels) {
    const key = `model:${m.id}`;
    const node: ConformanceNode = {
      type: "model",
      id: m.id,
      name: m.name,
      layer: m.layer,
      materialization: m.materialization,
      grain: m.grain,
      description: m.description,
      domainId: m.domainId,
      freshnessSla: m.freshnessSla,
      columns: colsByParent.get(key) ?? [],
      upstreamMaterializations: upstreamMats.get(m.id) ?? [],
      upstreamCount: upstreamCount.get(m.id) ?? 0,
      downstreamCount: downstreamCount.get(m.id) ?? 0,
      conceptLinks: conceptLinks.get(key) ?? 0,
      decisionLinks: decisionLinks.get(key) ?? 0,
    };
    const results = evaluateNode(node);
    const counts = scoreNode(results);
    nodes.push({
      type: "model",
      id: m.id,
      name: m.name,
      layer: m.layer,
      domainId: m.domainId,
      score: counts.score,
      results,
      counts,
    });
  }

  for (const s of visSources) {
    const key = `source:${s.id}`;
    const node: ConformanceNode = {
      type: "source",
      id: s.id,
      name: s.name,
      layer: null,
      materialization: null,
      grain: s.grain,
      description: s.description,
      domainId: s.domainId,
      freshnessSla: s.freshnessSla,
      columns: colsByParent.get(key) ?? [],
      upstreamMaterializations: [],
      upstreamCount: 0,
      downstreamCount: 0,
      conceptLinks: conceptLinks.get(key) ?? 0,
      decisionLinks: decisionLinks.get(key) ?? 0,
    };
    const results = evaluateNode(node);
    const counts = scoreNode(results);
    nodes.push({
      type: "source",
      id: s.id,
      name: s.name,
      layer: null,
      domainId: s.domainId,
      score: counts.score,
      results,
      counts,
    });
  }

  // Rollups.
  const platformScore = rollupScore(nodes.map((n) => n.score));
  const byDomain = new Map<string, number[]>();
  for (const n of nodes) {
    if (!n.domainId) continue;
    const list = byDomain.get(n.domainId) ?? [];
    list.push(n.score);
    byDomain.set(n.domainId, list);
  }
  const domainScores: Record<string, number> = {};
  for (const [domainId, scores] of byDomain) {
    const s = rollupScore(scores);
    if (s !== null) domainScores[domainId] = s;
  }

  // Resolve principle pages (title -> slug) for the check metadata.
  const titles = [...new Set(CHECKS.map((c) => c.principleTitle).filter((t): t is string => Boolean(t)))];
  const slugByTitle = new Map<string, string>();
  if (titles.length > 0) {
    const rows = await db
      .select({ title: pages.title, slug: pages.slug })
      .from(pages)
      .where(inArray(pages.title, titles));
    for (const r of rows) slugByTitle.set(r.title, r.slug);
  }
  const checks: CheckMeta[] = CHECKS.map((c) => ({
    key: c.key,
    title: c.title,
    description: c.description,
    appliesTo: c.appliesTo,
    severity: c.severity,
    principleSlug: c.principleTitle ? slugByTitle.get(c.principleTitle) ?? null : null,
  }));

  return { platformScore, nodes, domainScores, checks };
}
