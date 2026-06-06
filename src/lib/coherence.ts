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

function words(title: string): Set<string> {
  return new Set(normalizeTitle(title).split(" ").filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/**
 * Group titles that are likely the same concept: identical normalized form, or
 * a high word-overlap (Jaccard ≥ threshold). Union-find over near pairs.
 */
export function findNearDuplicates(
  nodes: TitledNode[],
  threshold = 0.6,
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
      const near =
        norm[i] === norm[j] ||
        norm[i].includes(norm[j]) ||
        norm[j].includes(norm[i]) ||
        jaccard(wsets[i], wsets[j]) >= threshold;
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
