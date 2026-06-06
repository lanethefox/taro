import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { pages } from "@/db/schema";
import { excerpt, type JSONContent } from "@/lib/content";

export type GlossaryEntry = {
  id: string;
  title: string;
  slug: string;
  definition: string;
  usedBy: number;
  visibility: "private" | "viewer" | "public";
};

/**
 * The glossary surface: every Concept page as a canonical definition, with a
 * count of how many other nodes link to it ("used by" — graph-wide backlinks).
 */
export async function getGlossary(): Promise<GlossaryEntry[]> {
  const rows = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      content: pages.content,
      visibility: pages.visibility,
      usedBy: sql<number>`(
        select count(*)::int from links l
        where l.target_type = 'page' and l.target_id = ${pages.id}
      )`,
    })
    .from(pages)
    .where(eq(pages.kind, "concept"))
    .orderBy(asc(pages.title));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    definition: excerpt(r.content as JSONContent | null, 220),
    usedBy: Number(r.usedBy),
    visibility: r.visibility,
  }));
}
