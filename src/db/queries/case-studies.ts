import "server-only";

import { and, asc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  caseStudies,
  caseStudyTasks,
  type CaseStudy,
  type CaseStudyTask,
} from "@/db/schema";
import { buildTaskStarterDoc, CURRICULUM } from "@/lib/case-studies/curriculum";
import type { JSONContent } from "@/lib/content";
import { slugify } from "@/lib/slug";

export type Visibility = "private" | "viewer" | "public";

export type CaseStudyWithProgress = Pick<
  CaseStudy,
  "id" | "name" | "slug" | "scenario" | "visibility" | "updatedAt"
> & { done: number; total: number };

/** Case studies with baseline completion counts, for the index tiles. */
export async function listCaseStudiesWithProgress(): Promise<
  CaseStudyWithProgress[]
> {
  return db
    .select({
      id: caseStudies.id,
      name: caseStudies.name,
      slug: caseStudies.slug,
      scenario: caseStudies.scenario,
      visibility: caseStudies.visibility,
      updatedAt: caseStudies.updatedAt,
      total: sql<number>`count(${caseStudyTasks.id}) filter (where ${caseStudyTasks.kind} = 'baseline')::int`,
      done: sql<number>`count(${caseStudyTasks.id}) filter (where ${caseStudyTasks.kind} = 'baseline' and ${caseStudyTasks.status} = 'done')::int`,
    })
    .from(caseStudies)
    .leftJoin(caseStudyTasks, eq(caseStudyTasks.caseStudyId, caseStudies.id))
    .groupBy(caseStudies.id)
    .orderBy(asc(caseStudies.name));
}

export async function getCaseStudyBySlug(
  slug: string,
): Promise<CaseStudy | undefined> {
  const [row] = await db
    .select()
    .from(caseStudies)
    .where(eq(caseStudies.slug, slug))
    .limit(1);
  return row;
}

export async function getCaseStudyById(
  id: string,
): Promise<CaseStudy | undefined> {
  const [row] = await db
    .select()
    .from(caseStudies)
    .where(eq(caseStudies.id, id))
    .limit(1);
  return row;
}

async function uniqueCaseStudySlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let n = 1;
  for (;;) {
    const [clash] = await db
      .select({ id: caseStudies.id })
      .from(caseStudies)
      .where(eq(caseStudies.slug, candidate))
      .limit(1);
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

async function uniqueTaskSlug(
  caseStudyId: string,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let n = 1;
  for (;;) {
    const where = excludeId
      ? and(
          eq(caseStudyTasks.caseStudyId, caseStudyId),
          eq(caseStudyTasks.slug, candidate),
          ne(caseStudyTasks.id, excludeId),
        )
      : and(
          eq(caseStudyTasks.caseStudyId, caseStudyId),
          eq(caseStudyTasks.slug, candidate),
        );
    const [clash] = await db
      .select({ id: caseStudyTasks.id })
      .from(caseStudyTasks)
      .where(where)
      .limit(1);
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

/**
 * Create a case study and seed it with the default curriculum (one task per
 * item, with a starter workspace doc). Returns the new tasks so the caller can
 * sync their concept links.
 */
export async function createCaseStudy(input: {
  name: string;
  scenario?: string | null;
}): Promise<{ caseStudy: CaseStudy; tasks: CaseStudyTask[] }> {
  const slug = await uniqueCaseStudySlug(input.name);
  const [caseStudy] = await db
    .insert(caseStudies)
    .values({
      name: input.name.trim() || "Untitled case study",
      slug,
      scenario: input.scenario ?? null,
    })
    .returning();

  const rows = CURRICULUM.map((item, i) => ({
    caseStudyId: caseStudy.id,
    slug: slugify(item.title),
    track: item.track,
    category: item.category,
    title: item.title,
    description: item.description,
    content: buildTaskStarterDoc(item) as unknown as JSONContent,
    kind: "baseline" as const,
    position: i,
  }));

  const tasks = await db.insert(caseStudyTasks).values(rows).returning();
  return { caseStudy, tasks };
}

export async function updateCaseStudy(
  id: string,
  input: { name?: string; scenario?: string | null; visibility?: Visibility },
): Promise<CaseStudy | undefined> {
  const patch: Partial<typeof caseStudies.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim() || "Untitled";
  if (input.scenario !== undefined) patch.scenario = input.scenario;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  const [row] = await db
    .update(caseStudies)
    .set(patch)
    .where(eq(caseStudies.id, id))
    .returning();
  return row;
}

export async function deleteCaseStudy(id: string): Promise<void> {
  await db.delete(caseStudies).where(eq(caseStudies.id, id)); // tasks cascade
}

export async function getTasks(caseStudyId: string): Promise<CaseStudyTask[]> {
  return db
    .select()
    .from(caseStudyTasks)
    .where(eq(caseStudyTasks.caseStudyId, caseStudyId))
    .orderBy(asc(caseStudyTasks.position), asc(caseStudyTasks.title));
}

export async function getTaskBySlug(
  caseStudyId: string,
  slug: string,
): Promise<CaseStudyTask | undefined> {
  const [row] = await db
    .select()
    .from(caseStudyTasks)
    .where(
      and(
        eq(caseStudyTasks.caseStudyId, caseStudyId),
        eq(caseStudyTasks.slug, slug),
      ),
    )
    .limit(1);
  return row;
}

export async function getTaskById(
  id: string,
): Promise<CaseStudyTask | undefined> {
  const [row] = await db
    .select()
    .from(caseStudyTasks)
    .where(eq(caseStudyTasks.id, id))
    .limit(1);
  return row;
}

export async function updateTask(
  id: string,
  input: {
    title?: string;
    content?: JSONContent | null;
    status?: "todo" | "in_progress" | "done";
  },
): Promise<CaseStudyTask | undefined> {
  const patch: Partial<typeof caseStudyTasks.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.content !== undefined) patch.content = input.content;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completedAt = input.status === "done" ? new Date() : null;
  }
  if (input.title !== undefined) {
    const existing = await getTaskById(id);
    if (existing) {
      patch.title = input.title.trim() || "Untitled task";
      patch.slug = await uniqueTaskSlug(existing.caseStudyId, patch.title, id);
    }
  }
  const [row] = await db
    .update(caseStudyTasks)
    .set(patch)
    .where(eq(caseStudyTasks.id, id))
    .returning();
  return row;
}

export async function addImprovementTask(
  caseStudyId: string,
  input: { title: string; description?: string | null },
): Promise<CaseStudyTask> {
  const slug = await uniqueTaskSlug(caseStudyId, input.title);
  const [{ maxPos }] = await db
    .select({
      maxPos: sql<number>`coalesce(max(${caseStudyTasks.position}), 0)::int`,
    })
    .from(caseStudyTasks)
    .where(eq(caseStudyTasks.caseStudyId, caseStudyId));

  const [row] = await db
    .insert(caseStudyTasks)
    .values({
      caseStudyId,
      slug,
      track: "technical",
      category: "Improvement",
      title: input.title.trim() || "Improvement",
      description: input.description ?? null,
      kind: "improvement",
      position: (maxPos ?? 0) + 1,
    })
    .returning();
  return row;
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(caseStudyTasks).where(eq(caseStudyTasks.id, id));
}

export type TrackProgress = { done: number; total: number };
export type CaseStudyProgress = {
  technical: TrackProgress;
  business: TrackProgress;
  overall: TrackProgress;
  improvements: TrackProgress;
};

/** Completion counts for a case study (baseline drives the tracks/overall). */
export function computeProgress(tasks: CaseStudyTask[]): CaseStudyProgress {
  const tally = (preds: (t: CaseStudyTask) => boolean): TrackProgress => {
    const list = tasks.filter(preds);
    return { total: list.length, done: list.filter((t) => t.status === "done").length };
  };
  const baseline = (t: CaseStudyTask) => t.kind === "baseline";
  return {
    technical: tally((t) => baseline(t) && t.track === "technical"),
    business: tally((t) => baseline(t) && t.track === "business"),
    overall: tally(baseline),
    improvements: tally((t) => t.kind === "improvement"),
  };
}
