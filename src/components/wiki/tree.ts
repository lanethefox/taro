import type { PageListItem } from "@/db/queries/pages";

export type TreeNode = PageListItem & { children: TreeNode[] };

/** Build a nested tree from flat pages via `parent_id`, sorted by title. */
export function buildTree(pages: PageListItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  pages.forEach((p) => map.set(p.id, { ...p, children: [] }));

  const roots: TreeNode[] = [];
  map.forEach((node) => {
    const parent = node.parentId ? map.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.title.localeCompare(b.title));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}
