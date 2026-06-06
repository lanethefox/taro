/**
 * Pure layout + state helpers for the wiki "skill tree" view. No DB or React
 * here so it can be unit-smoke-tested with `node --experimental-strip-types`.
 *
 * Mastery is honest: it comes from how much visible text a page actually has.
 * The layout is a tidy top-down tree — leaves get sequential slots, parents
 * centre over their children — producing deterministic pixel coordinates the
 * client renders as glowing nodes + connecting branches.
 */

export type NodeState = "mastered" | "seedling" | "stub";

/** Thresholds calibrated against the seeded reference pages (chars of text). */
export function nodeState(textLen: number): NodeState {
  if (textLen >= 600) return "mastered";
  if (textLen > 0) return "seedling";
  return "stub";
}

/** First ~150 chars of a page's text, whitespace-collapsed, for the detail card. */
export function excerptOf(text: string, max = 150): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

export type FlatPage = {
  id: string;
  title: string;
  slug: string;
  kind: string;
  parentId: string | null;
  text: string;
};

export type TreeNode = {
  id: string;
  title: string;
  slug: string;
  kind: string;
  state: NodeState;
  excerpt: string;
  textLen: number;
  children: TreeNode[];
};

/** Build the nested tree, deriving state/excerpt, sorted by title at each level. */
export function buildSkillTree(pages: FlatPage[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const p of pages) {
    const textLen = p.text.replace(/\s+/g, " ").trim().length;
    map.set(p.id, {
      id: p.id,
      title: p.title,
      slug: p.slug,
      kind: p.kind,
      state: nodeState(textLen),
      excerpt: excerptOf(p.text),
      textLen,
      children: [],
    });
  }
  const roots: TreeNode[] = [];
  for (const p of pages) {
    const node = map.get(p.id)!;
    const parent = p.parentId ? map.get(p.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.title.localeCompare(b.title));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export type PlacedNode = {
  id: string;
  title: string;
  slug: string;
  kind: string;
  state: NodeState;
  excerpt: string;
  depth: number;
  cx: number;
  cy: number;
  childTitles: string[];
};

export type Edge = { x1: number; y1: number; x2: number; y2: number; state: NodeState };
export type Layout = { nodes: PlacedNode[]; edges: Edge[]; width: number; height: number };

export const NODE = 60;
const HGAP = 152;
const VGAP = 150;
const PADX = 70;
const PADY = 64;

/** Assign tidy coordinates to every node; edges connect parents to children. */
export function layoutTree(roots: TreeNode[]): Layout {
  const pos = new Map<string, { x: number; depth: number }>();
  let leaf = 0;

  const assign = (n: TreeNode, depth: number) => {
    if (n.children.length === 0) {
      pos.set(n.id, { x: leaf, depth });
      leaf += 1;
      return;
    }
    n.children.forEach((c) => assign(c, depth + 1));
    const xs = n.children.map((c) => pos.get(c.id)!.x);
    pos.set(n.id, { x: (Math.min(...xs) + Math.max(...xs)) / 2, depth });
  };
  roots.forEach((r, i) => {
    if (i > 0) leaf += 1; // a blank column between separate roots
    assign(r, 0);
  });

  let maxX = 0;
  let maxDepth = 0;
  pos.forEach((p) => {
    maxX = Math.max(maxX, p.x);
    maxDepth = Math.max(maxDepth, p.depth);
  });

  const center = (id: string) => {
    const p = pos.get(id)!;
    return { cx: PADX + p.x * HGAP, cy: PADY + p.depth * VGAP };
  };

  const nodes: PlacedNode[] = [];
  const edges: Edge[] = [];
  const walk = (n: TreeNode) => {
    const c = center(n.id);
    nodes.push({
      id: n.id,
      title: n.title,
      slug: n.slug,
      kind: n.kind,
      state: n.state,
      excerpt: n.excerpt,
      depth: pos.get(n.id)!.depth,
      cx: c.cx,
      cy: c.cy,
      childTitles: n.children.map((ch) => ch.title),
    });
    for (const ch of n.children) {
      const cc = center(ch.id);
      edges.push({ x1: c.cx, y1: c.cy, x2: cc.cx, y2: cc.cy, state: ch.state });
      walk(ch);
    }
  };
  roots.forEach(walk);

  return {
    nodes,
    edges,
    width: PADX * 2 + maxX * HGAP,
    height: PADY * 2 + maxDepth * VGAP,
  };
}

export type SkillHud = {
  level: number;
  xpInto: number;
  xpForLevel: number;
  totalXp: number;
  skillPoints: number;
  pagesWritten: number;
  pagesTotal: number;
  seedlings: number;
  coverage: number; // 0..100
};

const XP_PER_TASK = 100;
const TASKS_PER_LEVEL = 5;

/** Derive the HUD from real case-study task counts + page mastery counts. */
export function computeHud(input: {
  tasksDone: number;
  tasksTotal: number;
  pagesWritten: number;
  pagesTotal: number;
  seedlings: number;
}): SkillHud {
  const totalXp = input.tasksDone * XP_PER_TASK;
  const level = Math.floor(input.tasksDone / TASKS_PER_LEVEL) + 1;
  const xpInto = (input.tasksDone % TASKS_PER_LEVEL) * XP_PER_TASK;
  const xpForLevel = TASKS_PER_LEVEL * XP_PER_TASK;
  const coverage =
    input.pagesTotal > 0
      ? Math.round((input.pagesWritten / input.pagesTotal) * 100)
      : 0;
  return {
    level,
    xpInto,
    xpForLevel,
    totalXp,
    skillPoints: Math.max(0, input.tasksTotal - input.tasksDone),
    pagesWritten: input.pagesWritten,
    pagesTotal: input.pagesTotal,
    seedlings: input.seedlings,
    coverage,
  };
}
