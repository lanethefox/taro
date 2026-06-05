import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { excerpt, type JSONContent } from "@/lib/content";
import { nodeHref } from "@/lib/links";

export type SearchResult = {
  type: "page" | "post";
  id: string;
  title: string;
  href: string;
  snippet: string;
  badge: string;
};

type Row = {
  id: string;
  title: string;
  slug: string;
  kind: string;
  content: JSONContent | null;
  rank: number;
  sim: number;
};

/**
 * Global search over pages + posts: Postgres full-text (ranked) with a trigram
 * fuzzy fallback on the title (SPEC §7). Private rows are excluded unless owner.
 */
export async function search(
  query: string,
  { owner }: { owner: boolean },
): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const pageVis = owner ? sql`true` : sql`visibility <> 'private'`;
  const postVis = owner ? sql`true` : sql`visibility <> 'private'`;

  const pageRows = (await db.execute(sql`
    select id, title, slug, kind::text as kind, content,
      ts_rank(search_tsv, websearch_to_tsquery('english', ${q})) as rank,
      similarity(title, ${q}) as sim
    from pages
    where (${pageVis})
      and (search_tsv @@ websearch_to_tsquery('english', ${q}) or title % ${q})
    order by rank desc, sim desc
    limit 20
  `)) as unknown as Row[];

  const postRows = (await db.execute(sql`
    select id, title, slug, kind::text as kind, content,
      ts_rank(search_tsv, websearch_to_tsquery('english', ${q})) as rank,
      similarity(title, ${q}) as sim
    from posts
    where (${postVis})
      and (search_tsv @@ websearch_to_tsquery('english', ${q}) or title % ${q})
    order by rank desc, sim desc
    limit 20
  `)) as unknown as Row[];

  const results: (SearchResult & { score: number })[] = [];

  for (const r of pageRows) {
    results.push({
      type: "page",
      id: r.id,
      title: r.title,
      href: nodeHref("page", r.slug),
      snippet: excerpt(r.content, 160),
      badge: r.kind === "concept" ? "Concept" : "Page",
      score: Number(r.rank) * 2 + Number(r.sim),
    });
  }
  for (const r of postRows) {
    results.push({
      type: "post",
      id: r.id,
      title: r.title,
      href: nodeHref("post", r.slug, r.kind),
      snippet: excerpt(r.content, 160),
      badge: r.kind === "decision" ? "Decision" : "Blog",
      score: Number(r.rank) * 2 + Number(r.sim),
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .map((r) => ({
      type: r.type,
      id: r.id,
      title: r.title,
      href: r.href,
      snippet: r.snippet,
      badge: r.badge,
    }));
}
