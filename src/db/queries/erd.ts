import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  columns,
  diagramNodes,
  diagrams,
  models,
  relationships,
  type Column,
  type Diagram,
} from "@/db/schema";
import type { Visibility } from "@/db/queries/catalog";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type DiagramListItem = Pick<
  Diagram,
  "id" | "name" | "description" | "visibility" | "updatedAt"
> & { modelCount: number };

/** A column narrowed for ERD rendering/export. */
export type ErdColumn = Pick<
  Column,
  "id" | "name" | "dataType" | "description" | "isPk" | "isFk" | "position"
> & { tests: string[] };

/** A model placed on a diagram: catalog truth + saved layout + its columns. */
export type ErdModel = {
  modelId: string;
  name: string;
  layer: "staging" | "intermediate" | "marts";
  materialization: "view" | "table" | "incremental" | "ephemeral";
  grain: string | null;
  visibility: Visibility;
  x: number;
  y: number;
  columns: ErdColumn[];
};

/** A relationship whose both endpoints are on the diagram, names resolved. */
export type ErdRelationship = {
  id: string;
  fromModelId: string;
  fromModelName: string;
  fromColumnId: string | null;
  fromColumnName: string | null;
  toModelId: string;
  toModelName: string;
  toColumnId: string | null;
  toColumnName: string | null;
  cardinality: "one_to_one" | "one_to_many" | "many_to_many";
};

export type DiagramData = {
  diagram: Diagram;
  models: ErdModel[];
  relationships: ErdRelationship[];
};

export type RelationshipListItem = ErdRelationship;

function normalizeTests(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((t): t is string => typeof t === "string")
    : [];
}

/* -------------------------------------------------------------------------- */
/* Diagram reads                                                               */
/* -------------------------------------------------------------------------- */

export async function listDiagrams(): Promise<DiagramListItem[]> {
  const rows = await db
    .select({
      id: diagrams.id,
      name: diagrams.name,
      description: diagrams.description,
      visibility: diagrams.visibility,
      updatedAt: diagrams.updatedAt,
    })
    .from(diagrams)
    .orderBy(asc(diagrams.name));

  if (rows.length === 0) return [];

  // Tally placed models per diagram in one pass.
  const counts = await db
    .select({ diagramId: diagramNodes.diagramId })
    .from(diagramNodes);
  const tally = new Map<string, number>();
  for (const c of counts) tally.set(c.diagramId, (tally.get(c.diagramId) ?? 0) + 1);

  return rows.map((r) => ({ ...r, modelCount: tally.get(r.id) ?? 0 }));
}

export async function getDiagramById(id: string): Promise<Diagram | undefined> {
  const [row] = await db
    .select()
    .from(diagrams)
    .where(eq(diagrams.id, id))
    .limit(1);
  return row;
}

/**
 * Everything needed to render (or export) a diagram: the diagram itself, its
 * placed models with saved x/y and their ordered columns, and the
 * relationships whose *both* endpoints sit on the diagram (with from/to model +
 * column names resolved). Diagrams store layout only — table truth comes from
 * the catalog, so this always reflects the live models.
 */
export async function getDiagramData(
  diagramId: string,
): Promise<DiagramData | undefined> {
  const diagram = await getDiagramById(diagramId);
  if (!diagram) return undefined;

  // Placed models: join layout → catalog.
  const placed = await db
    .select({
      modelId: diagramNodes.modelId,
      x: diagramNodes.x,
      y: diagramNodes.y,
      name: models.name,
      layer: models.layer,
      materialization: models.materialization,
      grain: models.grain,
      visibility: models.visibility,
    })
    .from(diagramNodes)
    .innerJoin(models, eq(models.id, diagramNodes.modelId))
    .where(eq(diagramNodes.diagramId, diagramId))
    .orderBy(asc(models.name));

  const modelIds = placed.map((p) => p.modelId);

  // Columns for the placed models, in display order.
  const colRows = modelIds.length
    ? await db
        .select()
        .from(columns)
        .where(
          and(
            eq(columns.parentType, "model"),
            inArray(columns.parentId, modelIds),
          ),
        )
        .orderBy(asc(columns.position), asc(columns.name))
    : [];

  const colsByModel = new Map<string, ErdColumn[]>();
  for (const c of colRows) {
    const list = colsByModel.get(c.parentId) ?? [];
    list.push({
      id: c.id,
      name: c.name,
      dataType: c.dataType,
      description: c.description,
      isPk: c.isPk,
      isFk: c.isFk,
      position: c.position,
      tests: normalizeTests(c.tests),
    });
    colsByModel.set(c.parentId, list);
  }

  const erdModels: ErdModel[] = placed.map((p) => ({
    modelId: p.modelId,
    name: p.name,
    layer: p.layer,
    materialization: p.materialization,
    grain: p.grain,
    visibility: p.visibility,
    x: p.x,
    y: p.y,
    columns: colsByModel.get(p.modelId) ?? [],
  }));

  // Relationships with both endpoints present on the diagram.
  const placedSet = new Set(modelIds);
  const relRows = modelIds.length ? await listRelationships() : [];
  const relationshipsOnDiagram = relRows.filter(
    (r) => placedSet.has(r.fromModelId) && placedSet.has(r.toModelId),
  );

  return { diagram, models: erdModels, relationships: relationshipsOnDiagram };
}

/* -------------------------------------------------------------------------- */
/* Diagram mutations                                                           */
/* -------------------------------------------------------------------------- */

export async function createDiagram(input: {
  name: string;
}): Promise<Diagram> {
  const [row] = await db
    .insert(diagrams)
    .values({ name: input.name.trim() || "Untitled diagram" })
    .returning();
  return row;
}

export async function deleteDiagram(id: string): Promise<void> {
  // diagram_nodes cascade on diagram delete (FK onDelete: cascade).
  await db.delete(diagrams).where(eq(diagrams.id, id));
}

/* -------------------------------------------------------------------------- */
/* Diagram node (layout) mutations                                            */
/* -------------------------------------------------------------------------- */

/** Insert or update a model's saved position on a diagram (unique per pair). */
export async function upsertDiagramNode(
  diagramId: string,
  modelId: string,
  pos: { x: number; y: number },
): Promise<void> {
  await db
    .insert(diagramNodes)
    .values({ diagramId, modelId, x: pos.x, y: pos.y })
    .onConflictDoUpdate({
      target: [diagramNodes.diagramId, diagramNodes.modelId],
      set: { x: pos.x, y: pos.y, updatedAt: new Date() },
    });
}

/** Bulk position persistence — used by debounced drag saves. */
export async function saveDiagramNodePositions(
  diagramId: string,
  nodes: { modelId: string; x: number; y: number }[],
): Promise<void> {
  if (nodes.length === 0) return;
  await db.transaction(async (tx) => {
    for (const n of nodes) {
      await tx
        .insert(diagramNodes)
        .values({ diagramId, modelId: n.modelId, x: n.x, y: n.y })
        .onConflictDoUpdate({
          target: [diagramNodes.diagramId, diagramNodes.modelId],
          set: { x: n.x, y: n.y, updatedAt: new Date() },
        });
    }
  });
}

export async function addModelToDiagram(
  diagramId: string,
  modelId: string,
  pos: { x: number; y: number } = { x: 0, y: 0 },
): Promise<void> {
  await db
    .insert(diagramNodes)
    .values({ diagramId, modelId, x: pos.x, y: pos.y })
    .onConflictDoNothing();
}

export async function removeDiagramNode(
  diagramId: string,
  modelId: string,
): Promise<void> {
  await db
    .delete(diagramNodes)
    .where(
      and(
        eq(diagramNodes.diagramId, diagramId),
        eq(diagramNodes.modelId, modelId),
      ),
    );
}

/* -------------------------------------------------------------------------- */
/* Relationships                                                               */
/* -------------------------------------------------------------------------- */

/** All relationships, with from/to model + column names resolved. */
export async function listRelationships(): Promise<RelationshipListItem[]> {
  const rows = await db.select().from(relationships);
  if (rows.length === 0) return [];

  const modelIds = Array.from(
    new Set(rows.flatMap((r) => [r.fromModelId, r.toModelId])),
  );
  const columnIds = Array.from(
    new Set(
      rows.flatMap((r) => [r.fromColumnId, r.toColumnId]).filter(
        (v): v is string => Boolean(v),
      ),
    ),
  );

  const [modelRows, columnRows] = await Promise.all([
    modelIds.length
      ? db
          .select({ id: models.id, name: models.name })
          .from(models)
          .where(inArray(models.id, modelIds))
      : Promise.resolve([] as { id: string; name: string }[]),
    columnIds.length
      ? db
          .select({ id: columns.id, name: columns.name })
          .from(columns)
          .where(inArray(columns.id, columnIds))
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);

  const modelName = new Map(modelRows.map((m) => [m.id, m.name]));
  const columnName = new Map(columnRows.map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    id: r.id,
    fromModelId: r.fromModelId,
    fromModelName: modelName.get(r.fromModelId) ?? "?",
    fromColumnId: r.fromColumnId,
    fromColumnName: r.fromColumnId
      ? (columnName.get(r.fromColumnId) ?? null)
      : null,
    toModelId: r.toModelId,
    toModelName: modelName.get(r.toModelId) ?? "?",
    toColumnId: r.toColumnId,
    toColumnName: r.toColumnId
      ? (columnName.get(r.toColumnId) ?? null)
      : null,
    cardinality: r.cardinality,
  }));
}

export async function createRelationship(input: {
  fromModelId: string;
  fromColumnId?: string | null;
  toModelId: string;
  toColumnId?: string | null;
  cardinality?: "one_to_one" | "one_to_many" | "many_to_many";
}): Promise<void> {
  await db.insert(relationships).values({
    fromModelId: input.fromModelId,
    fromColumnId: input.fromColumnId ?? null,
    toModelId: input.toModelId,
    toColumnId: input.toColumnId ?? null,
    cardinality: input.cardinality ?? "one_to_many",
  });
}

export async function deleteRelationship(id: string): Promise<void> {
  await db.delete(relationships).where(eq(relationships.id, id));
}
