import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  columns,
  models,
  sources,
  type Column,
  type Model,
  type Source,
} from "@/db/schema";

export type ModelLayer = "staging" | "intermediate" | "marts";
export type Materialization = "view" | "table" | "incremental" | "ephemeral";
export type Visibility = "private" | "viewer" | "public";

export type ModelListItem = Pick<
  Model,
  "id" | "name" | "layer" | "materialization" | "grain" | "visibility" | "updatedAt"
>;

export type SourceListItem = Pick<
  Source,
  "id" | "name" | "system" | "visibility" | "updatedAt"
>;

/** A column with its inline tests narrowed to a string list. */
export type ColumnRow = Omit<Column, "tests"> & { tests: string[] };

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export async function listModels(): Promise<ModelListItem[]> {
  return db
    .select({
      id: models.id,
      name: models.name,
      layer: models.layer,
      materialization: models.materialization,
      grain: models.grain,
      visibility: models.visibility,
      updatedAt: models.updatedAt,
    })
    .from(models)
    .orderBy(asc(models.layer), asc(models.name));
}

export async function listSources(): Promise<SourceListItem[]> {
  return db
    .select({
      id: sources.id,
      name: sources.name,
      system: sources.system,
      visibility: sources.visibility,
      updatedAt: sources.updatedAt,
    })
    .from(sources)
    .orderBy(asc(sources.name));
}

export async function getModelById(id: string): Promise<Model | undefined> {
  const [row] = await db.select().from(models).where(eq(models.id, id)).limit(1);
  return row;
}

export async function getSourceById(id: string): Promise<Source | undefined> {
  const [row] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return row;
}

/** Columns for a model or source, in display order. */
export async function listColumns(
  parentType: "model" | "source",
  parentId: string,
): Promise<ColumnRow[]> {
  const rows = await db
    .select()
    .from(columns)
    .where(and(eq(columns.parentType, parentType), eq(columns.parentId, parentId)))
    .orderBy(asc(columns.position), asc(columns.name));
  return rows.map(normalizeColumn);
}

function normalizeColumn(c: Column): ColumnRow {
  const tests = Array.isArray(c.tests)
    ? (c.tests as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
  return { ...c, tests };
}

/* -------------------------------------------------------------------------- */
/* Models                                                                      */
/* -------------------------------------------------------------------------- */

export async function createModel(input: {
  name: string;
  layer?: ModelLayer;
}): Promise<Model> {
  const [row] = await db
    .insert(models)
    .values({
      name: input.name.trim() || "untitled_model",
      layer: input.layer ?? "staging",
    })
    .returning();
  return row;
}

export async function updateModel(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    layer?: ModelLayer;
    materialization?: Materialization;
    grain?: string | null;
    sqlNotes?: string | null;
    freshnessSla?: string | null;
    expectedVolume?: string | null;
    monitoringNotes?: string | null;
    visibility?: Visibility;
  },
): Promise<Model | undefined> {
  const patch: Partial<typeof models.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim() || "untitled_model";
  if (input.description !== undefined) patch.description = input.description;
  if (input.layer !== undefined) patch.layer = input.layer;
  if (input.materialization !== undefined) patch.materialization = input.materialization;
  if (input.grain !== undefined) patch.grain = input.grain;
  if (input.sqlNotes !== undefined) patch.sqlNotes = input.sqlNotes;
  if (input.freshnessSla !== undefined) patch.freshnessSla = input.freshnessSla;
  if (input.expectedVolume !== undefined) patch.expectedVolume = input.expectedVolume;
  if (input.monitoringNotes !== undefined) patch.monitoringNotes = input.monitoringNotes;
  if (input.visibility !== undefined) patch.visibility = input.visibility;

  const [row] = await db.update(models).set(patch).where(eq(models.id, id)).returning();
  return row;
}

export async function deleteModel(id: string): Promise<void> {
  await deleteColumnsFor("model", id);
  await db.delete(models).where(eq(models.id, id));
}

/* -------------------------------------------------------------------------- */
/* Sources                                                                     */
/* -------------------------------------------------------------------------- */

export async function createSource(input: {
  name: string;
  system?: string | null;
}): Promise<Source> {
  const [row] = await db
    .insert(sources)
    .values({
      name: input.name.trim() || "untitled_source",
      system: input.system ?? null,
    })
    .returning();
  return row;
}

export async function updateSource(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    system?: string | null;
    freshnessSla?: string | null;
    expectedVolume?: string | null;
    monitoringNotes?: string | null;
    visibility?: Visibility;
  },
): Promise<Source | undefined> {
  const patch: Partial<typeof sources.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim() || "untitled_source";
  if (input.description !== undefined) patch.description = input.description;
  if (input.system !== undefined) patch.system = input.system;
  if (input.freshnessSla !== undefined) patch.freshnessSla = input.freshnessSla;
  if (input.expectedVolume !== undefined) patch.expectedVolume = input.expectedVolume;
  if (input.monitoringNotes !== undefined) patch.monitoringNotes = input.monitoringNotes;
  if (input.visibility !== undefined) patch.visibility = input.visibility;

  const [row] = await db.update(sources).set(patch).where(eq(sources.id, id)).returning();
  return row;
}

export async function deleteSource(id: string): Promise<void> {
  await deleteColumnsFor("source", id);
  await db.delete(sources).where(eq(sources.id, id));
}

/* -------------------------------------------------------------------------- */
/* Columns                                                                     */
/* -------------------------------------------------------------------------- */

export type ColumnInput = {
  id?: string;
  name: string;
  dataType?: string | null;
  description?: string | null;
  isPk?: boolean;
  isFk?: boolean;
  tests?: string[];
};

async function deleteColumnsFor(
  parentType: "model" | "source",
  parentId: string,
): Promise<void> {
  await db
    .delete(columns)
    .where(and(eq(columns.parentType, parentType), eq(columns.parentId, parentId)));
}

/**
 * Replace a parent's columns with the supplied set: rows are rewritten in one
 * transaction so order (position) and removals always reconcile. Blank rows
 * (no name) are dropped.
 */
export async function reconcileColumns(
  parentType: "model" | "source",
  parentId: string,
  inputs: ColumnInput[],
): Promise<void> {
  const clean = inputs
    .map((c, i) => ({ ...c, position: i }))
    .filter((c) => c.name.trim().length > 0);

  await db.transaction(async (tx) => {
    await tx
      .delete(columns)
      .where(and(eq(columns.parentType, parentType), eq(columns.parentId, parentId)));
    if (clean.length === 0) return;
    await tx.insert(columns).values(
      clean.map((c) => ({
        parentType,
        parentId,
        name: c.name.trim(),
        dataType: c.dataType?.trim() || null,
        description: c.description?.trim() || null,
        isPk: c.isPk ?? false,
        isFk: c.isFk ?? false,
        position: c.position,
        tests: (c.tests ?? []).map((t) => t.trim()).filter(Boolean),
      })),
    );
  });
}
