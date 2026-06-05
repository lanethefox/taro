import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { pages, posts, tags, taggables, type NodeType } from "@/db/schema";
import { nodeHref } from "@/lib/links";
import { slugify } from "@/lib/slug";

export type TagSummary = { id: string; name: string; slug: string; color: string | null };

/** Parse a comma-separated tag string into clean, de-duplicated names. */
export function parseTagInput(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Upsert tags by slug and replace a node's tag attachments. */
export async function syncTags(
  nodeType: NodeType,
  nodeId: string,
  tagNames: string[],
): Promise<void> {
  const names = tagNames.map((n) => n.trim()).filter(Boolean);

  await db.transaction(async (tx) => {
    await tx
      .delete(taggables)
      .where(and(eq(taggables.nodeType, nodeType), eq(taggables.nodeId, nodeId)));

    if (names.length === 0) return;

    const values = names.map((name) => ({ name, slug: slugify(name) }));
    await tx.insert(tags).values(values).onConflictDoNothing({ target: tags.slug });

    const slugs = values.map((v) => v.slug);
    const tagRows = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.slug, slugs));

    if (tagRows.length > 0) {
      await tx
        .insert(taggables)
        .values(tagRows.map((t) => ({ nodeType, nodeId, tagId: t.id })))
        .onConflictDoNothing();
    }
  });
}

/** Tags attached to a single node. */
export async function getTagsForNode(
  nodeType: NodeType,
  nodeId: string,
): Promise<TagSummary[]> {
  return db
    .select({ id: tags.id, name: tags.name, slug: tags.slug, color: tags.color })
    .from(taggables)
    .innerJoin(tags, eq(tags.id, taggables.tagId))
    .where(and(eq(taggables.nodeType, nodeType), eq(taggables.nodeId, nodeId)))
    .orderBy(tags.name);
}

/** All tags with how many nodes use each — for the tag index. */
export async function listTagsWithCounts(): Promise<
  (TagSummary & { count: number })[]
> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      color: tags.color,
      count: sql<number>`count(${taggables.id})::int`,
    })
    .from(tags)
    .leftJoin(taggables, eq(taggables.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(tags.name);
}

export async function getTagBySlug(slug: string): Promise<TagSummary | undefined> {
  const [row] = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug, color: tags.color })
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1);
  return row;
}

export type TaggedNode = {
  nodeType: NodeType;
  id: string;
  title: string;
  href: string;
  visibility: "private" | "viewer" | "public";
};

/** Pages + posts carrying a given tag (for a tag page). */
export async function getNodesForTag(tagId: string): Promise<TaggedNode[]> {
  const taggedPages = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      visibility: pages.visibility,
    })
    .from(taggables)
    .innerJoin(
      pages,
      and(eq(taggables.nodeType, "page"), eq(pages.id, taggables.nodeId)),
    )
    .where(eq(taggables.tagId, tagId));

  const taggedPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      kind: posts.kind,
      visibility: posts.visibility,
    })
    .from(taggables)
    .innerJoin(
      posts,
      and(eq(taggables.nodeType, "post"), eq(posts.id, taggables.nodeId)),
    )
    .where(eq(taggables.tagId, tagId));

  return [
    ...taggedPages.map((p) => ({
      nodeType: "page" as const,
      id: p.id,
      title: p.title,
      href: nodeHref("page", p.slug),
      visibility: p.visibility,
    })),
    ...taggedPosts.map((p) => ({
      nodeType: "post" as const,
      id: p.id,
      title: p.title,
      href: nodeHref("post", p.slug, p.kind),
      visibility: p.visibility,
    })),
  ].sort((a, b) => a.title.localeCompare(b.title));
}
