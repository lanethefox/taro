"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createModel,
  createSource,
  deleteModel,
  deleteSource,
  getModelById,
  getSourceById,
  reconcileColumns,
  updateModel,
  updateSource,
} from "@/db/queries/catalog";
import { requireOwner } from "@/lib/auth";
import { removeAllLinksFor, setLinkedPages } from "@/lib/links";

/* -------------------------------------------------------------------------- */
/* Create (name-only, then redirect into the editor)                           */
/* -------------------------------------------------------------------------- */

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
});

export async function createModelAction(formData: FormData) {
  await requireOwner();
  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    redirect(
      `/catalog/models/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }
  const model = await createModel(parsed.data);
  revalidatePath("/catalog");
  redirect(`/catalog/models/${model.id}?edit=1`);
}

export async function createSourceAction(formData: FormData) {
  await requireOwner();
  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    redirect(
      `/catalog/sources/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }
  const source = await createSource(parsed.data);
  revalidatePath("/catalog");
  redirect(`/catalog/sources/${source.id}?edit=1`);
}

/* -------------------------------------------------------------------------- */
/* Save                                                                        */
/* -------------------------------------------------------------------------- */

const columnSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  dataType: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isPk: z.boolean().optional(),
  isFk: z.boolean().optional(),
  tests: z.array(z.string()).default([]),
});

const visibilitySchema = z.enum(["private", "viewer", "public"]);

const saveModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string(),
  layer: z.enum(["staging", "intermediate", "marts"]),
  materialization: z.enum(["view", "table", "incremental", "ephemeral"]),
  grain: z.string(),
  sqlNotes: z.string(),
  freshnessSla: z.string(),
  expectedVolume: z.string(),
  monitoringNotes: z.string(),
  visibility: visibilitySchema,
  columns: z.array(columnSchema).default([]),
  conceptIds: z.array(z.string().uuid()).default([]),
});

const saveSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string(),
  system: z.string(),
  grain: z.string(),
  freshnessSla: z.string(),
  expectedVolume: z.string(),
  monitoringNotes: z.string(),
  visibility: visibilitySchema,
  columns: z.array(columnSchema).default([]),
  conceptIds: z.array(z.string().uuid()).default([]),
});

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveModelAction(
  input: z.infer<typeof saveModelSchema>,
): Promise<SaveResult> {
  await requireOwner();
  const parsed = saveModelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const model = await updateModel(d.id, {
    name: d.name,
    description: d.description || null,
    layer: d.layer,
    materialization: d.materialization,
    grain: d.grain || null,
    sqlNotes: d.sqlNotes || null,
    freshnessSla: d.freshnessSla || null,
    expectedVolume: d.expectedVolume || null,
    monitoringNotes: d.monitoringNotes || null,
    visibility: d.visibility,
  });
  if (!model) return { ok: false, error: "Model not found" };

  await reconcileColumns("model", model.id, d.columns);
  await setLinkedPages("model", model.id, d.conceptIds);

  revalidatePath("/catalog");
  revalidatePath(`/catalog/models/${model.id}`);
  return { ok: true, id: model.id };
}

export async function saveSourceAction(
  input: z.infer<typeof saveSourceSchema>,
): Promise<SaveResult> {
  await requireOwner();
  const parsed = saveSourceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const source = await updateSource(d.id, {
    name: d.name,
    description: d.description || null,
    system: d.system || null,
    grain: d.grain || null,
    freshnessSla: d.freshnessSla || null,
    expectedVolume: d.expectedVolume || null,
    monitoringNotes: d.monitoringNotes || null,
    visibility: d.visibility,
  });
  if (!source) return { ok: false, error: "Source not found" };

  await reconcileColumns("source", source.id, d.columns);
  await setLinkedPages("source", source.id, d.conceptIds);

  revalidatePath("/catalog");
  revalidatePath(`/catalog/sources/${source.id}`);
  return { ok: true, id: source.id };
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                      */
/* -------------------------------------------------------------------------- */

export async function deleteModelAction(id: string): Promise<void> {
  await requireOwner();
  const model = await getModelById(id);
  if (!model) return;
  await removeAllLinksFor("model", id);
  await deleteModel(id);
  revalidatePath("/catalog");
  redirect("/catalog");
}

export async function deleteSourceAction(id: string): Promise<void> {
  await requireOwner();
  const source = await getSourceById(id);
  if (!source) return;
  await removeAllLinksFor("source", id);
  await deleteSource(id);
  revalidatePath("/catalog");
  redirect("/catalog");
}
