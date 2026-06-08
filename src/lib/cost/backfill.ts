/**
 * Backfill cost prediction (pure). Estimates what re-processing a node over a
 * window would cost, at source / model / column granularity, from the node's
 * cost function and the units a backfill would touch. A model backfill can
 * optionally include its downstream descendants; a column is estimated as its
 * share of the node. Smoke-testable.
 */
import { costForUnits, round2, type CostFunction } from "./compute";

export type BackfillNode = {
  id: string;
  name: string;
  type: "model" | "source";
  fn: CostFunction;
  /** Average units per period (rows / MAR / run-seconds), from usage history. */
  unitsPerPeriod: number;
  columnCount: number;
};

export type BackfillEstimate = {
  nodeId: string;
  name: string;
  units: number;
  cost: number;
};

/** Cost of backfilling a single node across `periods`. */
export function estimateNode(node: BackfillNode, periods: number): BackfillEstimate {
  const units = node.unitsPerPeriod * Math.max(0, periods);
  return { nodeId: node.id, name: node.name, units, cost: round2(costForUnits(node.fn, units)) };
}

/** One column's share of its node's backfill cost. */
export function estimateColumn(
  node: BackfillNode,
  periods: number,
  columnName: string,
): BackfillEstimate {
  const whole = estimateNode(node, periods);
  const share = node.columnCount > 0 ? 1 / node.columnCount : 1;
  return {
    nodeId: `${node.id}:${columnName}`,
    name: `${node.name}.${columnName}`,
    units: whole.units * share,
    cost: round2(whole.cost * share),
  };
}

/** A model backfill including its downstream descendants (rebuild cascade). */
export function estimateWithDescendants(
  root: BackfillNode,
  descendants: BackfillNode[],
  periods: number,
): { total: number; self: BackfillEstimate; descendants: BackfillEstimate[] } {
  const self = estimateNode(root, periods);
  const desc = descendants.map((d) => estimateNode(d, periods));
  const total = round2(self.cost + desc.reduce((a, b) => a + b.cost, 0));
  return { total, self, descendants: desc };
}
