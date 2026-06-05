import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import {
  caseStudies,
  caseStudyTasks,
  links,
  models,
  pages,
  posts,
  sources,
  type NodeType,
} from "@/db/schema";
import { extractWikilinkTitles, type JSONContent } from "@/lib/content";
import { resolveOrCreatePageByTitle } from "@/db/queries/pages";

export type Backlink = {
  sourceType: NodeType;
  sourceId: string;
  title: string;
  href: string;
  context: string | null;
};

/** Route to a node's reader view. */
export function nodeHref(
  type: NodeType,
  slug: string,
  kind?: string | null,
): string {
  switch (type) {
    case "page":
      return `/wiki/${slug}`;
    case "post":
      return kind === "decision" ? `/decisions/${slug}` : `/blog/${slug}`;
    case "case_study":
      return `/case-studies/${slug}`;
    case "model":
      return `/catalog/models/${slug}`;
    case "source":
      return `/catalog/sources/${slug}`;
    default:
      return "#";
  }
}

/**
 * Pages a catalog (or other) node links *to* — the forward "Related concepts"
 * direction. Replaces wikilinks for catalog nodes, whose descriptions are plain
 * text. Private pages are omitted unless `includePrivate` (owner view).
 */
export async function getLinkedPages(
  sourceType: NodeType,
  sourceId: string,
  { includePrivate = false }: { includePrivate?: boolean } = {},
): Promise<{ id: string; title: string; slug: string }[]> {
  const rows = await db
    .select({
      title: pages.title,
      slug: pages.slug,
      id: pages.id,
      visibility: pages.visibility,
    })
    .from(links)
    .innerJoin(pages, eq(pages.id, links.targetId))
    .where(
      and(
        eq(links.sourceType, sourceType),
        eq(links.sourceId, sourceId),
        eq(links.targetType, "page"),
      ),
    );

  return rows
    .filter((r) => includePrivate || r.visibility !== "private")
    .map((r) => ({ id: r.id, title: r.title, slug: r.slug }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Replace a node's outgoing page-links with an explicit set of page ids. Used
 * by the catalog "Related concepts" picker (catalog nodes carry no wikilinks).
 */
export async function setLinkedPages(
  sourceType: NodeType,
  sourceId: string,
  pageIds: string[],
): Promise<void> {
  const unique = Array.from(new Set(pageIds.filter(Boolean)));
  await db.transaction(async (tx) => {
    await tx
      .delete(links)
      .where(
        and(
          eq(links.sourceType, sourceType),
          eq(links.sourceId, sourceId),
          eq(links.targetType, "page"),
        ),
      );
    if (unique.length > 0) {
      await tx
        .insert(links)
        .values(
          unique.map((targetId) => ({
            sourceType,
            sourceId,
            targetType: "page" as const,
            targetId,
          })),
        )
        .onConflictDoNothing();
    }
  });
}

/**
 * Reconcile a node's outgoing `[[wikilinks]]` with the `links` table.
 *
 * Works for any source (page or post). Wikilink titles resolve to pages
 * (creating a stub for unresolved "red" links so the graph stays connected),
 * then the source's outgoing page-links are replaced in one transaction.
 * Returns the resolved target page ids.
 */
export async function syncLinks(
  sourceType: NodeType,
  sourceId: string,
  doc: JSONContent | null,
): Promise<string[]> {
  const titles = extractWikilinkTitles(doc);

  const targetIds: string[] = [];
  for (const title of titles) {
    const targetId = await resolveOrCreatePageByTitle(title);
    const isSelf = sourceType === "page" && targetId === sourceId;
    if (!isSelf && !targetIds.includes(targetId)) targetIds.push(targetId);
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(links)
      .where(
        and(
          eq(links.sourceType, sourceType),
          eq(links.sourceId, sourceId),
          eq(links.targetType, "page"),
        ),
      );
    if (targetIds.length > 0) {
      await tx
        .insert(links)
        .values(
          targetIds.map((targetId) => ({
            sourceType,
            sourceId,
            targetType: "page" as const,
            targetId,
          })),
        )
        .onConflictDoNothing();
    }
  });

  return targetIds;
}

/** Remove every link touching a node (either endpoint) — call before deleting. */
export async function removeAllLinksFor(
  nodeType: NodeType,
  nodeId: string,
): Promise<void> {
  await db
    .delete(links)
    .where(
      or(
        and(eq(links.sourceType, nodeType), eq(links.sourceId, nodeId)),
        and(eq(links.targetType, nodeType), eq(links.targetId, nodeId)),
      ),
    );
}

/**
 * Nodes that link *to* the given node ("referenced by"). Resolves source pages
 * and posts to titles + reader hrefs. Private sources are omitted unless
 * `includePrivate` (owner view).
 */
export async function getBacklinks(
  nodeType: NodeType,
  nodeId: string,
  { includePrivate = false }: { includePrivate?: boolean } = {},
): Promise<Backlink[]> {
  const rows = await db
    .select({
      sourceType: links.sourceType,
      sourceId: links.sourceId,
      context: links.context,
    })
    .from(links)
    .where(and(eq(links.targetType, nodeType), eq(links.targetId, nodeId)));

  if (rows.length === 0) return [];

  const pageIds = rows.filter((r) => r.sourceType === "page").map((r) => r.sourceId);
  const postIds = rows.filter((r) => r.sourceType === "post").map((r) => r.sourceId);
  const taskIds = rows.filter((r) => r.sourceType === "task").map((r) => r.sourceId);
  const modelIds = rows.filter((r) => r.sourceType === "model").map((r) => r.sourceId);
  const sourceIds = rows
    .filter((r) => r.sourceType === "source")
    .map((r) => r.sourceId);

  const [pageRows, postRows, taskRows, modelRows, sourceRows] = await Promise.all([
    pageIds.length
      ? db
          .select({
            id: pages.id,
            title: pages.title,
            slug: pages.slug,
            visibility: pages.visibility,
          })
          .from(pages)
          .where(inArray(pages.id, pageIds))
      : Promise.resolve([]),
    postIds.length
      ? db
          .select({
            id: posts.id,
            title: posts.title,
            slug: posts.slug,
            kind: posts.kind,
            visibility: posts.visibility,
          })
          .from(posts)
          .where(inArray(posts.id, postIds))
      : Promise.resolve([]),
    taskIds.length
      ? db
          .select({
            id: caseStudyTasks.id,
            title: caseStudyTasks.title,
            taskSlug: caseStudyTasks.slug,
            caseSlug: caseStudies.slug,
            caseName: caseStudies.name,
            visibility: caseStudies.visibility,
          })
          .from(caseStudyTasks)
          .innerJoin(caseStudies, eq(caseStudies.id, caseStudyTasks.caseStudyId))
          .where(inArray(caseStudyTasks.id, taskIds))
      : Promise.resolve([]),
    modelIds.length
      ? db
          .select({
            id: models.id,
            name: models.name,
            visibility: models.visibility,
          })
          .from(models)
          .where(inArray(models.id, modelIds))
      : Promise.resolve([]),
    sourceIds.length
      ? db
          .select({
            id: sources.id,
            name: sources.name,
            visibility: sources.visibility,
          })
          .from(sources)
          .where(inArray(sources.id, sourceIds))
      : Promise.resolve([]),
  ]);

  const out: Backlink[] = [];

  for (const r of rows) {
    if (r.sourceType === "page") {
      const p = pageRows.find((x) => x.id === r.sourceId);
      if (!p) continue;
      if (!includePrivate && p.visibility === "private") continue;
      out.push({
        sourceType: "page",
        sourceId: r.sourceId,
        title: p.title,
        href: nodeHref("page", p.slug),
        context: r.context,
      });
    } else if (r.sourceType === "post") {
      const p = postRows.find((x) => x.id === r.sourceId);
      if (!p) continue;
      if (!includePrivate && p.visibility === "private") continue;
      out.push({
        sourceType: "post",
        sourceId: r.sourceId,
        title: p.title,
        href: nodeHref("post", p.slug, p.kind),
        context: r.context,
      });
    } else if (r.sourceType === "task") {
      const t = taskRows.find((x) => x.id === r.sourceId);
      if (!t) continue;
      if (!includePrivate && t.visibility === "private") continue;
      out.push({
        sourceType: "task",
        sourceId: r.sourceId,
        title: `${t.title} · ${t.caseName}`,
        href: `/case-studies/${t.caseSlug}/${t.taskSlug}`,
        context: r.context,
      });
    } else if (r.sourceType === "model") {
      const m = modelRows.find((x) => x.id === r.sourceId);
      if (!m) continue;
      if (!includePrivate && m.visibility === "private") continue;
      out.push({
        sourceType: "model",
        sourceId: r.sourceId,
        title: m.name,
        href: nodeHref("model", m.id),
        context: r.context,
      });
    } else if (r.sourceType === "source") {
      const s = sourceRows.find((x) => x.id === r.sourceId);
      if (!s) continue;
      if (!includePrivate && s.visibility === "private") continue;
      out.push({
        sourceType: "source",
        sourceId: r.sourceId,
        title: s.name,
        href: nodeHref("source", s.id),
        context: r.context,
      });
    }
  }

  return out.sort((a, b) => a.title.localeCompare(b.title));
}
