"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { costConfigs, costUsage } from "@/db/schema";
import { getBackfillContext } from "@/db/queries/cost";
import {
  estimateNode,
  estimateWithDescendants,
} from "@/lib/cost/backfill";
import { round2 } from "@/lib/cost/compute";
import { requireOwner, requireSession } from "@/lib/auth";

/* -------------------------------------------------------------------------- */
/* Configure a cost function (owner)                                            */
/* -------------------------------------------------------------------------- */

const configSchema = z.object({
  scope: z.enum(["source", "model", "global"]),
  nodeId: z.string().uuid().nullable().optional(),
  unit: z.string().trim().max(40).optional(),
  method: z.enum(["flat", "per_unit", "tiered"]),
  fixedCost: z.number().nonnegative().optional(),
  perUnitRate: z.number().nonnegative().optional(),
  currency: z.string().trim().max(8).default("USD"),
});

export type CostConfigInput = z.infer<typeof configSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveCostConfigAction(input: CostConfigInput): Promise<ActionResult> {
  const ctx = await requireOwner();
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const values = {
    scope: d.scope,
    nodeId: d.scope === "global" ? null : d.nodeId ?? null,
    unit: d.unit || null,
    method: d.method,
    fixedCost: d.fixedCost === undefined ? null : String(d.fixedCost),
    perUnitRate: d.perUnitRate === undefined ? null : String(d.perUnitRate),
    currency: d.currency,
    updatedBy: ctx.user.id,
    updatedAt: new Date(),
  };

  const existing = await db
    .select({ id: costConfigs.id })
    .from(costConfigs)
    .where(
      and(
        eq(costConfigs.scope, d.scope),
        d.scope === "global" ? isNull(costConfigs.nodeId) : eq(costConfigs.nodeId, d.nodeId ?? ""),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db.update(costConfigs).set(values).where(eq(costConfigs.id, existing[0].id));
  } else {
    await db.insert(costConfigs).values(values);
  }
  revalidatePath("/taro/cost");
  revalidatePath("/taro/cost/config");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Set measured usage for a node/period (owner)                                */
/* -------------------------------------------------------------------------- */

const usageSchema = z.object({
  nodeType: z.enum(["model", "source"]),
  nodeId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  units: z.number().nonnegative(),
});

export async function setUsageAction(input: z.infer<typeof usageSchema>): Promise<ActionResult> {
  await requireOwner();
  const parsed = usageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  await db
    .insert(costUsage)
    .values({ nodeType: d.nodeType, nodeId: d.nodeId, period: d.period, units: String(d.units), source: "manual" })
    .onConflictDoUpdate({
      target: [costUsage.nodeType, costUsage.nodeId, costUsage.period],
      set: { units: String(d.units), source: "manual", updatedAt: new Date() },
    });
  revalidatePath("/taro/cost");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Predict a backfill (any approved user)                                      */
/* -------------------------------------------------------------------------- */

const backfillSchema = z.object({
  nodeType: z.enum(["model", "source"]),
  nodeId: z.string().uuid(),
  periods: z.number().min(1).max(120),
  includeDescendants: z.boolean().default(false),
});

export type BackfillResult =
  | {
      ok: true;
      name: string;
      unit: string | null;
      units: number;
      nodeCost: number;
      columnShare: number;
      descendantCount: number;
      cascadeTotal: number;
    }
  | { ok: false; error: string };

export async function estimateBackfillAction(
  input: z.infer<typeof backfillSchema>,
): Promise<BackfillResult> {
  await requireSession();
  const parsed = backfillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const ctx = await getBackfillContext(d.nodeType, d.nodeId);
  if (!ctx) return { ok: false, error: "Node not found" };

  const self = estimateNode(ctx.node, d.periods);
  const cascade = estimateWithDescendants(ctx.node, ctx.descendants, d.periods);
  const columnShare =
    ctx.node.columnCount > 0 ? round2(self.cost / ctx.node.columnCount) : self.cost;

  return {
    ok: true,
    name: self.name,
    unit: ctx.node.fn.unit,
    units: self.units,
    nodeCost: self.cost,
    columnShare,
    descendantCount: ctx.descendants.length,
    cascadeTotal: d.includeDescendants ? cascade.total : self.cost,
  };
}
