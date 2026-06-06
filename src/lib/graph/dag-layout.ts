/**
 * Pure left-to-right layered layout for a model dependency DAG. No React Flow or
 * DB imports so it can be smoke-tested with `node --experimental-strip-types`.
 *
 * Columns are assigned by longest-path depth from the roots (a model sits one
 * column right of its furthest-upstream parent), so lineage reads source → mart
 * left to right. Rows are packed within a column and vertically centred.
 */

export type ModelLayer = "staging" | "intermediate" | "marts";
export type Materialization = "view" | "table" | "incremental" | "ephemeral";

export type GraphModel = {
  id: string;
  name: string;
  layer: ModelLayer;
  materialization: Materialization;
  grain: string | null;
};

export type GraphDep = { upstreamId: string; downstreamId: string };

export type LaidOutNode = {
  id: string;
  x: number;
  y: number;
  depth: number;
  name: string;
  layer: ModelLayer;
  materialization: Materialization;
  grain: string | null;
};

export type LaidOutEdge = { id: string; source: string; target: string };

export type DagLayout = {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
};

export const NODE_W = 210;
export const NODE_H = 64;
const COL_GAP = 90; // horizontal gap between columns
const ROW_GAP = 26; // vertical gap between stacked nodes
const PAD = 24;

const COL_STRIDE = NODE_W + COL_GAP;
const ROW_STRIDE = NODE_H + ROW_GAP;

/** Lay out models + dependencies into positioned nodes and edges. */
export function layoutDag(models: GraphModel[], deps: GraphDep[]): DagLayout {
  const ids = new Set(models.map((m) => m.id));
  const incoming = new Map<string, string[]>();
  models.forEach((m) => incoming.set(m.id, []));

  // Keep only edges whose both endpoints are present (respects visibility filtering).
  const edges = deps.filter((d) => ids.has(d.upstreamId) && ids.has(d.downstreamId));
  for (const e of edges) incoming.get(e.downstreamId)!.push(e.upstreamId);

  // Longest-path depth via memoized DFS, with a cycle guard (DAG expected).
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const calc = (id: string): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0; // defensive: break any accidental cycle
    visiting.add(id);
    let d = 0;
    for (const up of incoming.get(id) ?? []) d = Math.max(d, calc(up) + 1);
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };
  models.forEach((m) => calc(m.id));

  // Bucket by depth; order within a column by layer then name for stability.
  const layerRank: Record<ModelLayer, number> = { staging: 0, intermediate: 1, marts: 2 };
  const byDepth = new Map<number, GraphModel[]>();
  let maxDepth = 0;
  for (const m of models) {
    const d = depth.get(m.id)!;
    maxDepth = Math.max(maxDepth, d);
    (byDepth.get(d) ?? byDepth.set(d, []).get(d)!).push(m);
  }

  let maxRows = 0;
  byDepth.forEach((list) => {
    list.sort(
      (a, b) => layerRank[a.layer] - layerRank[b.layer] || a.name.localeCompare(b.name),
    );
    maxRows = Math.max(maxRows, list.length);
  });

  const totalHeight = Math.max(1, maxRows) * ROW_STRIDE - ROW_GAP;
  const nodes: LaidOutNode[] = [];
  byDepth.forEach((list, d) => {
    // Vertically centre each column relative to the tallest one.
    const colHeight = list.length * ROW_STRIDE - ROW_GAP;
    const offsetY = (totalHeight - colHeight) / 2;
    list.forEach((m, i) => {
      nodes.push({
        id: m.id,
        x: PAD + d * COL_STRIDE,
        y: PAD + offsetY + i * ROW_STRIDE,
        depth: d,
        name: m.name,
        layer: m.layer,
        materialization: m.materialization,
        grain: m.grain,
      });
    });
  });

  const laidOutEdges: LaidOutEdge[] = edges.map((e) => ({
    id: `${e.upstreamId}->${e.downstreamId}`,
    source: e.upstreamId,
    target: e.downstreamId,
  }));

  return {
    nodes,
    edges: laidOutEdges,
    width: PAD * 2 + (maxDepth + 1) * COL_STRIDE - COL_GAP,
    height: PAD * 2 + totalHeight,
  };
}
