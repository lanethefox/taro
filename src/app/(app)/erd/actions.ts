"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  addModelToDiagram,
  createDiagram,
  createRelationship,
  deleteDiagram,
  deleteRelationship,
  removeDiagramNode,
  saveDiagramNodePositions,
} from "@/db/queries/erd";
import { requireOwner } from "@/lib/auth";

/* -------------------------------------------------------------------------- */
/* Create / delete diagram                                                     */
/* -------------------------------------------------------------------------- */

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
});

export async function createDiagramAction(formData: FormData) {
  await requireOwner();
  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    redirect(`/erd?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const diagram = await createDiagram(parsed.data);
  revalidatePath("/erd");
  redirect(`/erd/${diagram.id}`);
}

export async function deleteDiagramAction(id: string): Promise<void> {
  await requireOwner();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return;
  await deleteDiagram(parsed.data);
  revalidatePath("/erd");
  redirect("/erd");
}

/* -------------------------------------------------------------------------- */
/* Place / remove models                                                       */
/* -------------------------------------------------------------------------- */

const addModelSchema = z.object({
  diagramId: z.string().uuid(),
  modelId: z.string().uuid(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addModelToDiagramAction(
  input: z.infer<typeof addModelSchema>,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = addModelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { diagramId, modelId, x, y } = parsed.data;
  await addModelToDiagram(diagramId, modelId, { x: x ?? 0, y: y ?? 0 });
  revalidatePath(`/erd/${diagramId}`);
  return { ok: true };
}

const removeModelSchema = z.object({
  diagramId: z.string().uuid(),
  modelId: z.string().uuid(),
});

export async function removeModelFromDiagramAction(
  input: z.infer<typeof removeModelSchema>,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = removeModelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { diagramId, modelId } = parsed.data;
  await removeDiagramNode(diagramId, modelId);
  revalidatePath(`/erd/${diagramId}`);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Persist layout (debounced drag saves)                                       */
/* -------------------------------------------------------------------------- */

const positionsSchema = z.object({
  diagramId: z.string().uuid(),
  nodes: z
    .array(
      z.object({
        modelId: z.string().uuid(),
        x: z.number(),
        y: z.number(),
      }),
    )
    .max(500),
});

export async function saveNodePositionsAction(
  input: z.infer<typeof positionsSchema>,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = positionsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await saveDiagramNodePositions(parsed.data.diagramId, parsed.data.nodes);
  // No revalidate: positions are saved silently in the background.
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Relationships                                                               */
/* -------------------------------------------------------------------------- */

const createRelSchema = z.object({
  diagramId: z.string().uuid(),
  fromModelId: z.string().uuid(),
  fromColumnId: z.string().uuid().nullable().optional(),
  toModelId: z.string().uuid(),
  toColumnId: z.string().uuid().nullable().optional(),
  cardinality: z
    .enum(["one_to_one", "one_to_many", "many_to_many"])
    .default("one_to_many"),
});

export async function createRelationshipAction(
  input: z.infer<typeof createRelSchema>,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = createRelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  if (d.fromModelId === d.toModelId && d.fromColumnId === d.toColumnId) {
    return { ok: false, error: "A relationship can't point a column at itself" };
  }
  await createRelationship({
    fromModelId: d.fromModelId,
    fromColumnId: d.fromColumnId ?? null,
    toModelId: d.toModelId,
    toColumnId: d.toColumnId ?? null,
    cardinality: d.cardinality,
  });
  revalidatePath(`/erd/${d.diagramId}`);
  return { ok: true };
}

const deleteRelSchema = z.object({
  diagramId: z.string().uuid(),
  relationshipId: z.string().uuid(),
});

export async function deleteRelationshipAction(
  input: z.infer<typeof deleteRelSchema>,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = deleteRelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await deleteRelationship(parsed.data.relationshipId);
  revalidatePath(`/erd/${parsed.data.diagramId}`);
  return { ok: true };
}
