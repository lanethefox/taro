/**
 * Pure coherence checks for the semantic layer. No DB/React imports so it can be
 * smoke-tested. Currently: flag near-duplicate concept titles (a non-blocking
 * nudge — the same idea defined twice is exactly the drift taro exists to avoid).
 */

export type TitledNode = { id: string; title: string; slug?: string };
export type DuplicateGroup = { members: TitledNode[] };

/** Normalize a title for comparison: lowercase, strip punctuation, de-plural. */
export function normalizeTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // naive singularization of the last word so "Customers" ≈ "Customer"
  return base.replace(/s\b/g, "");
}

/** Generic words that shouldn't drive a "same concept" match. */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "to", "for", "with",
  "is", "are", "as", "at", "by", "vs", "dbt",
]);

function words(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((w) => w && !STOPWORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/**
 * Group titles that are likely the *same* concept: identical normalized form, or
 * a high content-word overlap (Jaccard ≥ threshold over non-stopwords, requiring
 * at least two shared-meaning words so titles that merely share a generic word
 * like "in dbt" or "data stack" aren't flagged). Union-find over near pairs.
 */
export function findNearDuplicates(
  nodes: TitledNode[],
  threshold = 0.8,
): DuplicateGroup[] {
  const n = nodes.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (i: number, j: number) => {
    parent[find(i)] = find(j);
  };

  const norm = nodes.map((x) => normalizeTitle(x.title));
  const wsets = nodes.map((x) => words(x.title));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const bothMeaningful = Math.min(wsets[i].size, wsets[j].size) >= 2;
      const near =
        norm[i] === norm[j] ||
        (bothMeaningful && jaccard(wsets[i], wsets[j]) >= threshold);
      if (near) union(i, j);
    }
  }

  const groups = new Map<number, TitledNode[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(nodes[i]);
  }

  return [...groups.values()]
    .filter((m) => m.length > 1)
    .map((members) => ({ members }));
}
