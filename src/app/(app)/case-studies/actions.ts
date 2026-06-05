"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  addImprovementTask,
  createCaseStudy,
  deleteCaseStudy,
  deleteTask,
  getCaseStudyById,
  getTaskById,
  updateCaseStudy,
  updateTask,
} from "@/db/queries/case-studies";
import { requireOwner } from "@/lib/auth";
import type { JSONContent } from "@/lib/content";
import { removeAllLinksFor, syncLinks } from "@/lib/links";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  scenario: z.string().trim().max(2000).optional(),
});

export async function createCaseStudyAction(formData: FormData) {
  await requireOwner();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    scenario: (formData.get("scenario") as string) || undefined,
  });
  if (!parsed.success) {
    redirect(
      `/case-studies/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const { caseStudy, tasks } = await createCaseStudy(parsed.data);
  // Wire each seeded task's starter wikilinks to the concept pages.
  for (const task of tasks) {
    await syncLinks("task", task.id, task.content as JSONContent | null);
  }

  revalidatePath("/case-studies");
  redirect(`/case-studies/${caseStudy.slug}`);
}

const editSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  scenario: z.string().trim().max(2000).optional(),
  visibility: z.enum(["private", "viewer", "public"]),
});

export type EditResult = { ok: true; slug: string } | { ok: false; error: string };

export async function updateCaseStudyAction(input: {
  id: string;
  name: string;
  scenario?: string;
  visibility: "private" | "viewer" | "public";
}): Promise<EditResult> {
  await requireOwner();
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const cs = await updateCaseStudy(parsed.data.id, {
    name: parsed.data.name,
    scenario: parsed.data.scenario ?? null,
    visibility: parsed.data.visibility,
  });
  if (!cs) return { ok: false, error: "Not found" };
  revalidatePath("/case-studies");
  revalidatePath(`/case-studies/${cs.slug}`);
  return { ok: true, slug: cs.slug };
}

export async function deleteCaseStudyAction(id: string): Promise<void> {
  await requireOwner();
  await deleteCaseStudy(id);
  revalidatePath("/case-studies");
  redirect("/case-studies");
}

const saveTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  content: z.unknown(),
  status: z.enum(["todo", "in_progress", "done"]),
});

export type SaveTaskResult =
  | { ok: true; caseSlug: string; taskSlug: string }
  | { ok: false; error: string };

export async function saveTaskAction(input: {
  id: string;
  title: string;
  content: JSONContent;
  status: "todo" | "in_progress" | "done";
}): Promise<SaveTaskResult> {
  await requireOwner();
  const parsed = saveTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const task = await updateTask(parsed.data.id, {
    title: parsed.data.title,
    content: parsed.data.content as JSONContent,
    status: parsed.data.status,
  });
  if (!task) return { ok: false, error: "Task not found" };

  await syncLinks("task", task.id, parsed.data.content as JSONContent);

  const cs = await getCaseStudyById(task.caseStudyId);
  if (!cs) return { ok: false, error: "Case study not found" };

  revalidatePath(`/case-studies/${cs.slug}`);
  revalidatePath(`/case-studies/${cs.slug}/${task.slug}`);
  return { ok: true, caseSlug: cs.slug, taskSlug: task.slug };
}

/** Quick status flip from the board (no content change). */
export async function setTaskStatusAction(
  id: string,
  status: "todo" | "in_progress" | "done",
): Promise<void> {
  await requireOwner();
  const task = await updateTask(id, { status });
  if (task) {
    const cs = await getCaseStudyById(task.caseStudyId);
    if (cs) revalidatePath(`/case-studies/${cs.slug}`);
  }
}

const improvementSchema = z.object({
  caseStudyId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(500).optional(),
});

export async function addImprovementAction(formData: FormData) {
  await requireOwner();
  const parsed = improvementSchema.safeParse({
    caseStudyId: formData.get("caseStudyId"),
    title: formData.get("title"),
    description: (formData.get("description") as string) || undefined,
  });
  if (!parsed.success) return;

  await addImprovementTask(parsed.data.caseStudyId, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
  });
  const cs = await getCaseStudyById(parsed.data.caseStudyId);
  if (cs) revalidatePath(`/case-studies/${cs.slug}`);
}

export async function deleteTaskAction(id: string): Promise<void> {
  await requireOwner();
  const task = await getTaskById(id);
  if (!task) return;
  await removeAllLinksFor("task", id);
  await deleteTask(id);
  const cs = await getCaseStudyById(task.caseStudyId);
  if (cs) revalidatePath(`/case-studies/${cs.slug}`);
}
