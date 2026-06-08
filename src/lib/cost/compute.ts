/**
 * Cost math (pure). A cost function turns measured usage (units) into money. It's
 * the same shape whether the unit is Fivetran MAR, Segment MTU, warehouse GB,
 * model run-seconds, or LLM tokens — which is what lets one FinOps model cover
 * ingestion, transformation, and serving. Smoke-testable.
 */

export type CostMethod = "flat" | "per_unit" | "tiered";

/** A tier band: a marginal `rate` applied up to `upTo` units (null = no ceiling). */
export type CostTier = { upTo: number | null; rate: number };

export type CostFunction = {
  method: CostMethod;
  /** Base charge added regardless of usage (platform fee, minimum). */
  fixedCost: number;
  /** Rate per unit for the `per_unit` method. */
  perUnitRate: number;
  /** Bands for the `tiered` method, ascending by `upTo`. */
  tiers: CostTier[];
  unit: string | null;
  currency: string;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Normalize a `cost_configs` row (numeric strings, jsonb tiers) to a CostFunction. */
export function toCostFunction(row: {
  method: CostMethod;
  fixedCost: string | number | null;
  perUnitRate: string | number | null;
  tiers: unknown;
  unit: string | null;
  currency: string | null;
}): CostFunction {
  const tiers: CostTier[] = Array.isArray(row.tiers)
    ? row.tiers
        .map((t) => {
          const o = (t ?? {}) as Record<string, unknown>;
          return { upTo: o.upTo == null ? null : num(o.upTo), rate: num(o.rate) };
        })
        .sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity))
    : [];
  return {
    method: row.method,
    fixedCost: num(row.fixedCost),
    perUnitRate: num(row.perUnitRate),
    tiers,
    unit: row.unit,
    currency: row.currency ?? "USD",
  };
}

/** Cost of `units` under a cost function. Tiered uses marginal (banded) pricing. */
export function costForUnits(fn: CostFunction, units: number): number {
  const u = Math.max(0, units);
  if (fn.method === "flat") return fn.fixedCost;
  if (fn.method === "per_unit") return fn.fixedCost + fn.perUnitRate * u;

  let cost = fn.fixedCost;
  let lower = 0;
  for (const t of fn.tiers) {
    const upper = t.upTo ?? Infinity;
    const band = Math.min(u, upper) - lower;
    if (band > 0) cost += band * t.rate;
    lower = upper;
    if (u <= upper) break;
  }
  // Units beyond the last finite tier fall through with the last tier's rate.
  const last = fn.tiers[fn.tiers.length - 1];
  if (last && last.upTo !== null && u > last.upTo) {
    cost += (u - last.upTo) * last.rate;
  }
  return cost;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
