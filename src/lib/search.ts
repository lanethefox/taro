import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { excerpt, type JSONContent } from "@/lib/content";
import { nodeHref } from "@/lib/links";

export type SearchResult = {
  type: "page" | "post" | "model" | "source" | "column";
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

type CatalogRow = {
  id: string;
  name: string;
  description: string | null;
  sim: number;
};

type ColumnRow = {
  id: string;
  name: string;
  description: string | null;
  parent_type: string;
  parent_id: string;
  parent_name: string | null;
  sim: number;
};

/**
 * Global search across the whole graph: pages + posts (Postgres FTS, ranked),
 * plus catalog models / sources / columns (trigram + ILIKE, since those tables
 * carry no tsvector). Concepts are pages (`kind = 'concept'`), so the semantic
 * layer is searchable here too. Private rows are excluded unless owner.
 */
export async function search(
  query: string,
  { owner }: { owner: boolean },
): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const vis = owner ? sql`true` : sql`visibility <> 'private'`;
  const like = `%${q}%`;

  const [pageRows, postRows, modelRows, sourceRows, columnRows] = await Promise.all([
    db.execute(sql`
      select id, title, slug, kind::text as kind, content,
        ts_rank(search_tsv, websearch_to_tsquery('english', ${q})) as rank,
        similarity(title, ${q}) as sim
      from pages
      where (${vis})
        and (search_tsv @@ websearch_to_tsquery('english', ${q}) or title % ${q})
      order by rank desc, sim desc
      limit 20
    `) as unknown as Promise<Row[]>,
    db.execute(sql`
      select id, title, slug, kind::text as kind, content,
        ts_rank(search_tsv, websearch_to_tsquery('english', ${q})) as rank,
        similarity(title, ${q}) as sim
      from posts
      where (${vis})
        and (search_tsv @@ websearch_to_tsquery('english', ${q}) or title % ${q})
      order by rank desc, sim desc
      limit 20
    `) as unknown as Promise<Row[]>,
    db.execute(sql`
      select id, name, description, similarity(name, ${q}) as sim
      from models
      where (${vis})
        and (name % ${q} or name ilike ${like} or description ilike ${like})
      order by sim desc
      limit 10
    `) as unknown as Promise<CatalogRow[]>,
    db.execute(sql`
      select id, name, description, similarity(name, ${q}) as sim
      from sources
      where (${vis})
        and (name % ${q} or name ilike ${like} or description ilike ${like})
      order by sim desc
      limit 10
    `) as unknown as Promise<CatalogRow[]>,
    db.execute(sql`
      select c.id, c.name, c.description, c.parent_type, c.parent_id,
        coalesce(m.name, s.name) as parent_name,
        similarity(c.name, ${q}) as sim
      from columns c
      left join models m on c.parent_type = 'model' and m.id = c.parent_id
      left join sources s on c.parent_type = 'source' and s.id = c.parent_id
      where (c.name % ${q} or c.name ilike ${like})
        and (${owner ? sql`true` : sql`coalesce(m.visibility, s.visibility) <> 'private'`})
      order by sim desc
      limit 10
    `) as unknown as Promise<ColumnRow[]>,
  ]);

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
  for (const r of modelRows) {
    results.push({
      type: "model",
      id: r.id,
      title: r.name,
      href: nodeHref("model", r.id),
      snippet: r.description ?? "",
      badge: "Model",
      score: Number(r.sim) * 2,
    });
  }
  for (const r of sourceRows) {
    results.push({
      type: "source",
      id: r.id,
      title: r.name,
      href: nodeHref("source", r.id),
      snippet: r.description ?? "",
      badge: "Source",
      score: Number(r.sim) * 2,
    });
  }
  for (const r of columnRows) {
    const href =
      r.parent_type === "model"
        ? nodeHref("model", r.parent_id)
        : nodeHref("source", r.parent_id);
    results.push({
      type: "column",
      id: r.id,
      title: r.parent_name ? `${r.parent_name}.${r.name}` : r.name,
      href,
      snippet: r.description ?? "",
      badge: "Column",
      score: Number(r.sim) * 1.5,
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
