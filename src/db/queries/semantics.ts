import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { links } from "@/db/schema";
import { getGlossary, type GlossaryEntry } from "@/db/queries/glossary";
import { getConformanceReport } from "@/db/queries/conformance";
import { findNearDuplicates } from "@/lib/coherence";

export type ConceptGovernance = GlossaryEntry & { catalogLinks: number };

export type SemanticGovernance = {
  concepts: ConceptGovernance[];
  orphans: ConceptGovernance[];
  duplicates: { members: { id: string; title: string; slug?: string }[] }[];
  coverage: { wired: number; total: number; pct: number };
};

/**
 * Governance view of the semantic layer: which concepts are actually wired to the
 * catalog, which are defined-but-unused, near-duplicates (coherence drift), and
 * what share of the catalog is linked to a concept at all.
 */
export async function getSemanticGovernance(
  opts: { includePrivate?: boolean } = {},
): Promise<SemanticGovernance> {
  const includePrivate = opts.includePrivate ?? false;
  const [glossary, catalogLinkRows, report] = await Promise.all([
    getGlossary(),
    db
      .select({ targetId: links.targetId })
      .from(links)
      .where(and(eq(links.targetType, "page"), inArray(links.sourceType, ["model", "source"]))),
    getConformanceReport({ includePrivate }),
  ]);

  const counts = new Map<string, number>();
  for (const r of catalogLinkRows) counts.set(r.targetId, (counts.get(r.targetId) ?? 0) + 1);

  const visible = includePrivate ? glossary : glossary.filter((c) => c.visibility !== "private");
  const concepts: ConceptGovernance[] = visible
    .map((c) => ({ ...c, catalogLinks: counts.get(c.id) ?? 0 }))
    .sort((a, b) => b.catalogLinks - a.catalogLinks || a.title.localeCompare(b.title));

  const orphans = concepts.filter((c) => c.catalogLinks === 0);

  const duplicates = findNearDuplicates(
    concepts.map((c) => ({ id: c.id, title: c.title, slug: c.slug })),
  ).filter((g) => g.members.length > 1);

  // Coverage: share of catalog nodes that pass the "linked to a concept" check.
  let wired = 0;
  let total = 0;
  for (const n of report.nodes) {
    const r = n.results.find((x) => x.key === "linked_concept");
    if (r && r.status !== "na") {
      total++;
      if (r.status === "pass") wired++;
    }
  }
  const pct = total > 0 ? Math.round((wired / total) * 100) : 0;

  return { concepts, orphans, duplicates, coverage: { wired, total, pct } };
}
