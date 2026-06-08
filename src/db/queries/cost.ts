import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { columns, costConfigs, costUsage, domains, modelDependencies, models, sources } from "@/db/schema";
import { costForUnits, round2, toCostFunction, type CostFunction } from "@/lib/cost/compute";
import type { BackfillNode } from "@/lib/cost/backfill";

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type CostNode = {
  type: "model" | "source";
  id: string;
  name: string;
  layer: "staging" | "intermediate" | "marts" | null;
  domainId: string | null;
  unit: string | null;
  units: number;
  cost: number;
};

export type ArmCost = {
  domainId: string;
  name: string;
  budget: number | null;
  actual: number;
};

export type CostReport = {
  total: number;
  totalBudget: number;
  period: string | null;
  arms: ArmCost[];
  byLayer: { layer: string; cost: number }[];
  topSpenders: CostNode[];
  /** Every costed node (catalog is small) — lets a domain panel slice its own spend. */
  nodes: CostNode[];
  currency: string;
};

type ConfigRow = typeof costConfigs.$inferSelect;

async function loadConfigs(): Promise<{
  global: CostFunction;
  bySource: Map<string, CostFunction>;
  byModel: Map<string, CostFunction>;
}> {
  const rows = await db.select().from(costConfigs);
  const defaultGlobal: CostFunction = {
    method: "per_unit",
    fixedCost: 0,
    perUnitRate: 0,
    tiers: [],
    unit: "run-seconds",
    currency: "USD",
  };
  let global = defaultGlobal;
  const bySource = new Map<string, CostFunction>();
  const byModel = new Map<string, CostFunction>();
  for (const r of rows as ConfigRow[]) {
    const fn = toCostFunction(r);
    if (r.scope === "global") global = fn;
    else if (r.scope === "source" && r.nodeId) bySource.set(r.nodeId, fn);
    else if (r.scope === "model" && r.nodeId) byModel.set(r.nodeId, fn);
  }
  return { global, bySource, byModel };
}

/** Latest usage period across all nodes, and a (type:id)->units map for it. */
async function loadLatestUsage(): Promise<{ period: string | null; units: Map<string, number> }> {
  const [latest] = await db
    .select({ period: costUsage.period })
    .from(costUsage)
    .orderBy(desc(costUsage.period))
    .limit(1);
  const period = latest?.period ?? null;
  const units = new Map<string, number>();
  if (period) {
    const rows = await db
      .select({ nodeType: costUsage.nodeType, nodeId: costUsage.nodeId, units: costUsage.units })
      .from(costUsage)
      .where(eq(costUsage.period, period));
    for (const r of rows) units.set(`${r.nodeType}:${r.nodeId}`, num(r.units));
  }
  return { period, units };
}

/** FinOps overview for the latest period: spend by arm, layer, and node. */
export async function getCostReport(
  opts: { includePrivate?: boolean } = {},
): Promise<CostReport> {
  const includePrivate = opts.includePrivate ?? false;
  const [cfg, usage, modelRows, sourceRows, domainRows] = await Promise.all([
    loadConfigs(),
    loadLatestUsage(),
    db
      .select({ id: models.id, name: models.name, layer: models.layer, domainId: models.domainId, visibility: models.visibility })
      .from(models),
    db
      .select({ id: sources.id, name: sources.name, domainId: sources.domainId, visibility: sources.visibility })
      .from(sources),
    db.select({ id: domains.id, name: domains.name, budget: domains.monthlyBudget }).from(domains).orderBy(domains.position),
  ]);

  const visModels = includePrivate ? modelRows : modelRows.filter((m) => m.visibility !== "private");
  const visSources = includePrivate ? sourceRows : sourceRows.filter((s) => s.visibility !== "private");

  const nodes: CostNode[] = [];
  for (const m of visModels) {
    const fn = cfg.byModel.get(m.id) ?? cfg.global;
    const units = usage.units.get(`model:${m.id}`) ?? 0;
    nodes.push({
      type: "model",
      id: m.id,
      name: m.name,
      layer: m.layer,
      domainId: m.domainId,
      unit: fn.unit,
      units,
      cost: round2(costForUnits(fn, units)),
    });
  }
  for (const s of visSources) {
    const fn = cfg.bySource.get(s.id);
    const units = usage.units.get(`source:${s.id}`) ?? 0;
    nodes.push({
      type: "source",
      id: s.id,
      name: s.name,
      layer: null,
      domainId: s.domainId,
      unit: fn?.unit ?? null,
      units,
      cost: fn ? round2(costForUnits(fn, units)) : 0,
    });
  }

  const total = round2(nodes.reduce((a, n) => a + n.cost, 0));

  // Per-arm actual vs budget.
  const actualByDomain = new Map<string, number>();
  for (const n of nodes) {
    if (!n.domainId) continue;
    actualByDomain.set(n.domainId, (actualByDomain.get(n.domainId) ?? 0) + n.cost);
  }
  const arms: ArmCost[] = domainRows.map((d) => ({
    domainId: d.id,
    name: d.name,
    budget: d.budget === null ? null : num(d.budget),
    actual: round2(actualByDomain.get(d.id) ?? 0),
  }));
  const totalBudget = round2(arms.reduce((a, x) => a + (x.budget ?? 0), 0));

  // Spend by layer (models) + a "sources" bucket.
  const layerTotals = new Map<string, number>();
  for (const n of nodes) {
    const key = n.type === "source" ? "sources" : (n.layer ?? "other");
    layerTotals.set(key, (layerTotals.get(key) ?? 0) + n.cost);
  }
  const byLayer = [...layerTotals.entries()]
    .map(([layer, cost]) => ({ layer, cost: round2(cost) }))
    .sort((a, b) => b.cost - a.cost);

  const topSpenders = nodes
    .filter((n) => n.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 12);

  return {
    total,
    totalBudget,
    period: usage.period,
    arms,
    byLayer,
    topSpenders,
    nodes,
    currency: cfg.global.currency,
  };
}

export type CostConfigView = {
  id: string;
  scope: "source" | "model" | "global";
  nodeId: string | null;
  nodeName: string | null;
  unit: string | null;
  method: "flat" | "per_unit" | "tiered";
  fixedCost: string | null;
  perUnitRate: string | null;
  currency: string;
};

/** All configs + every source (so the editor can add a function to any source). */
export async function getCostConfigEditor(): Promise<{
  global: CostConfigView | null;
  sources: { id: string; name: string; system: string | null; config: CostConfigView | null }[];
}> {
  const [cfgRows, sourceRows] = await Promise.all([
    db.select().from(costConfigs),
    db.select({ id: sources.id, name: sources.name, system: sources.system }).from(sources).orderBy(sources.name),
  ]);
  const view = (r: ConfigRow): CostConfigView => ({
    id: r.id,
    scope: r.scope,
    nodeId: r.nodeId,
    nodeName: null,
    unit: r.unit,
    method: r.method,
    fixedCost: r.fixedCost,
    perUnitRate: r.perUnitRate,
    currency: r.currency,
  });
  const bySource = new Map<string, ConfigRow>();
  let global: CostConfigView | null = null;
  for (const r of cfgRows as ConfigRow[]) {
    if (r.scope === "global") global = view(r);
    else if (r.scope === "source" && r.nodeId) bySource.set(r.nodeId, r);
  }
  return {
    global,
    sources: sourceRows.map((s) => {
      const r = bySource.get(s.id);
      return { id: s.id, name: s.name, system: s.system, config: r ? view(r) : null };
    }),
  };
}

export type CostableNode = { type: "model" | "source"; id: string; name: string };

export async function listCostableNodes(): Promise<CostableNode[]> {
  const [m, s] = await Promise.all([
    db.select({ id: models.id, name: models.name }).from(models).orderBy(models.name),
    db.select({ id: sources.id, name: sources.name }).from(sources).orderBy(sources.name),
  ]);
  return [
    ...s.map((x) => ({ type: "source" as const, id: x.id, name: x.name })),
    ...m.map((x) => ({ type: "model" as const, id: x.id, name: x.name })),
  ];
}

async function avgUnits(nodeType: "model" | "source", nodeId: string): Promise<number> {
  const rows = await db
    .select({ units: costUsage.units })
    .from(costUsage)
    .where(and(eq(costUsage.nodeType, nodeType), eq(costUsage.nodeId, nodeId)));
  if (rows.length === 0) return 0;
  return rows.reduce((a, r) => a + num(r.units), 0) / rows.length;
}

async function columnCount(parentType: "model" | "source", parentId: string): Promise<number> {
  const rows = await db
    .select({ id: columns.id })
    .from(columns)
    .where(and(eq(columns.parentType, parentType), eq(columns.parentId, parentId)));
  return rows.length;
}

/** Build the backfill context (node + cost fn + avg units + descendants) for an estimate. */
export async function getBackfillContext(
  nodeType: "model" | "source",
  nodeId: string,
): Promise<{ node: BackfillNode; descendants: BackfillNode[] } | null> {
  const cfg = await loadConfigs();

  async function build(type: "model" | "source", id: string, name: string): Promise<BackfillNode> {
    const fn = type === "source" ? cfg.bySource.get(id) ?? cfg.global : cfg.byModel.get(id) ?? cfg.global;
    return {
      id,
      name,
      type,
      fn,
      unitsPerPeriod: await avgUnits(type, id),
      columnCount: await columnCount(type, id),
    };
  }

  if (nodeType === "source") {
    const [s] = await db.select({ id: sources.id, name: sources.name }).from(sources).where(eq(sources.id, nodeId)).limit(1);
    if (!s) return null;
    return { node: await build("source", s.id, s.name), descendants: [] };
  }

  const [m] = await db.select({ id: models.id, name: models.name }).from(models).where(eq(models.id, nodeId)).limit(1);
  if (!m) return null;

  // Transitive downstream models (the rebuild cascade).
  const deps = await db
    .select({ upstreamId: modelDependencies.upstreamId, downstreamId: modelDependencies.downstreamId })
    .from(modelDependencies);
  const children = new Map<string, string[]>();
  for (const d of deps) {
    const list = children.get(d.upstreamId) ?? [];
    list.push(d.downstreamId);
    children.set(d.upstreamId, list);
  }
  const seen = new Set<string>([m.id]);
  const queue = [...(children.get(m.id) ?? [])];
  const descIds: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    descIds.push(id);
    for (const c of children.get(id) ?? []) queue.push(c);
  }
  const descModels = descIds.length
    ? await db.select({ id: models.id, name: models.name }).from(models).where(inArray(models.id, descIds))
    : [];

  return {
    node: await build("model", m.id, m.name),
    descendants: await Promise.all(descModels.map((d) => build("model", d.id, d.name))),
  };
}
