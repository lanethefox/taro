import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  caseStudies,
  caseStudyTasks,
  links,
  models,
  pages,
  posts,
  sources,
} from "@/db/schema";

/** A node in the whole-knowledge graph. `type` mirrors the links node-type. */
export type GraphViewNode = {
  id: string; // `${type}:${dbId}`
  type: "page" | "post" | "source" | "model" | "case_study" | "task";
  /** Sub-kind for styling (concept vs page, blog vs decision). */
  kind: string | null;
  label: string;
  href: string;
};

export type GraphViewEdge = { id: string; source: string; target: string };

export type KnowledgeGraph = { nodes: GraphViewNode[]; edges: GraphViewEdge[] };

const key = (type: string, id: string) => `${type}:${id}`;

/**
 * The entire linked graph: every page/post/model/source/case-study/task as a
 * node, and every `links` row whose both endpoints are visible as an edge.
 * `includePrivate` is true for the owner; viewers never see private nodes.
 */
export async function getKnowledgeGraph(
  includePrivate: boolean,
): Promise<KnowledgeGraph> {
  const [pageRows, postRows, modelRows, sourceRows, csRows, taskRows, linkRows] =
    await Promise.all([
      db
        .select({
          id: pages.id,
          title: pages.title,
          slug: pages.slug,
          kind: pages.kind,
          visibility: pages.visibility,
        })
        .from(pages),
      db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          kind: posts.kind,
          visibility: posts.visibility,
        })
        .from(posts),
      db
        .select({ id: models.id, name: models.name, visibility: models.visibility })
        .from(models),
      db
        .select({ id: sources.id, name: sources.name, visibility: sources.visibility })
        .from(sources),
      db
        .select({
          id: caseStudies.id,
          name: caseStudies.name,
          slug: caseStudies.slug,
          visibility: caseStudies.visibility,
        })
        .from(caseStudies),
      // Tasks inherit their case study's slug (for href) + visibility.
      db
        .select({
          id: caseStudyTasks.id,
          title: caseStudyTasks.title,
          slug: caseStudyTasks.slug,
          caseSlug: caseStudies.slug,
          visibility: caseStudies.visibility,
        })
        .from(caseStudyTasks)
        .innerJoin(caseStudies, eq(caseStudyTasks.caseStudyId, caseStudies.id)),
      db
        .select({
          sourceType: links.sourceType,
          sourceId: links.sourceId,
          targetType: links.targetType,
          targetId: links.targetId,
        })
        .from(links),
    ]);

  const show = (v: string) => includePrivate || v !== "private";
  const nodes: GraphViewNode[] = [];

  for (const p of pageRows) {
    if (!show(p.visibility)) continue;
    nodes.push({
      id: key("page", p.id),
      type: "page",
      kind: p.kind,
      label: p.title,
      href: `/wiki/${p.slug}`,
    });
  }
  for (const p of postRows) {
    if (!show(p.visibility)) continue;
    nodes.push({
      id: key("post", p.id),
      type: "post",
      kind: p.kind,
      label: p.title,
      href: p.kind === "decision" ? `/decisions/${p.slug}` : `/blog/${p.slug}`,
    });
  }
  for (const m of modelRows) {
    if (!show(m.visibility)) continue;
    nodes.push({
      id: key("model", m.id),
      type: "model",
      kind: null,
      label: m.name,
      href: `/catalog/models/${m.id}`,
    });
  }
  for (const s of sourceRows) {
    if (!show(s.visibility)) continue;
    nodes.push({
      id: key("source", s.id),
      type: "source",
      kind: null,
      label: s.name,
      href: `/catalog/sources/${s.id}`,
    });
  }
  for (const c of csRows) {
    if (!show(c.visibility)) continue;
    nodes.push({
      id: key("case_study", c.id),
      type: "case_study",
      kind: null,
      label: c.name,
      href: `/case-studies/${c.slug}`,
    });
  }
  for (const t of taskRows) {
    if (!show(t.visibility)) continue;
    nodes.push({
      id: key("task", t.id),
      type: "task",
      kind: null,
      label: t.title,
      href: `/case-studies/${t.caseSlug}/${t.slug}`,
    });
  }

  const present = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const edges: GraphViewEdge[] = [];
  for (const r of linkRows) {
    const s = key(r.sourceType, r.sourceId);
    const t = key(r.targetType, r.targetId);
    if (!present.has(s) || !present.has(t) || s === t) continue;
    // Collapse duplicate/bidirectional pairs into one undirected edge.
    const undirected = s < t ? `${s}|${t}` : `${t}|${s}`;
    if (seen.has(undirected)) continue;
    seen.add(undirected);
    edges.push({ id: undirected, source: s, target: t });
  }

  return { nodes, edges };
}
