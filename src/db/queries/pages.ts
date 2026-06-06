import "server-only";

import { and, asc, eq, ilike, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { pages, type Page } from "@/db/schema";
import { emptyDoc, type JSONContent } from "@/lib/content";
import { slugify } from "@/lib/slug";

export type PageListItem = Pick<
  Page,
  "id" | "title" | "slug" | "parentId" | "kind" | "visibility" | "updatedAt"
>;

/** All pages, lightweight — used to build the tree and resolve links. */
export async function listPages(): Promise<PageListItem[]> {
  return db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      parentId: pages.parentId,
      kind: pages.kind,
      visibility: pages.visibility,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .orderBy(asc(pages.title));
}

export async function getPageBySlug(slug: string): Promise<Page | undefined> {
  const [row] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  return row;
}

export async function getPageById(id: string): Promise<Page | undefined> {
  const [row] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  return row;
}

/** Case-insensitive title lookup — the resolver for `[[wikilinks]]`. */
export async function getPageByTitle(title: string): Promise<Page | undefined> {
  const [row] = await db
    .select()
    .from(pages)
    .where(ilike(pages.title, title))
    .limit(1);
  return row;
}

/** Generate a slug unique across pages, appending -2, -3, … on collision. */
async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let n = 1;
  // Loop until no other page owns the candidate slug.
  for (;;) {
    const where = excludeId
      ? and(eq(pages.slug, candidate), ne(pages.id, excludeId))
      : eq(pages.slug, candidate);
    const [clash] = await db.select({ id: pages.id }).from(pages).where(where).limit(1);
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function createPage(input: {
  title: string;
  parentId?: string | null;
  kind?: "wiki" | "concept";
  content?: JSONContent | null;
}): Promise<Page> {
  const slug = await uniqueSlug(input.title);
  const [row] = await db
    .insert(pages)
    .values({
      title: input.title.trim() || "Untitled",
      slug,
      parentId: input.parentId ?? null,
      kind: input.kind ?? "wiki",
      content: input.content ?? emptyDoc(),
    })
    .returning();
  return row;
}

export async function updatePage(
  id: string,
  input: {
    title?: string;
    content?: JSONContent | null;
    parentId?: string | null;
    visibility?: "private" | "viewer" | "public";
  },
): Promise<Page | undefined> {
  const patch: Partial<typeof pages.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) patch.title = input.title.trim() || "Untitled";
  if (input.content !== undefined) patch.content = input.content;
  if (input.parentId !== undefined) patch.parentId = input.parentId;
  if (input.visibility !== undefined) patch.visibility = input.visibility;

  const [row] = await db.update(pages).set(patch).where(eq(pages.id, id)).returning();
  return row;
}

/**
 * Delete a page. Children are re-parented to the deleted page's parent so the
 * tree never orphans. (Link cleanup is handled by the caller via the links lib.)
 */
export async function deletePage(id: string): Promise<void> {
  const target = await getPageById(id);
  if (!target) return;
  await db
    .update(pages)
    .set({ parentId: target.parentId ?? null })
    .where(eq(pages.parentId, id));
  await db.delete(pages).where(eq(pages.id, id));
}

/** Resolve a title to an existing page id, creating a stub page if missing. */
export async function resolveOrCreatePageByTitle(title: string): Promise<string> {
  const existing = await getPageByTitle(title);
  if (existing) return existing.id;
  const created = await createPage({ title });
  return created.id;
}

/** Count pages (used to gate seed/empty states). */
export async function countPages(): Promise<number> {
  const [{ value }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(pages);
  return value;
}
