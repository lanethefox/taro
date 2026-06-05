"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight, FileText, Hash, Plus } from "lucide-react";

import type { PageListItem } from "@/db/queries/pages";
import { buildTree, type TreeNode } from "@/components/wiki/tree";
import { cn } from "@/lib/utils";

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const href = `/wiki/${node.slug}`;
  const active = pathname === href;
  const hasChildren = node.children.length > 0;
  const Icon = node.kind === "concept" ? Hash : FileText;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center rounded-md pr-1 text-sm",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        )}
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded transition-transform",
            !hasChildren && "invisible",
            open && "rotate-90",
          )}
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronRight className="size-3.5" />
        </button>
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5">
          <Icon className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate">{node.title}</span>
        </Link>
      </div>
      {hasChildren && open ? (
        <ul>
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function PageTree({
  pages,
  canCreate,
}: {
  pages: PageListItem[];
  canCreate: boolean;
}) {
  const tree = buildTree(pages);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <Link href="/wiki" className="text-sm font-semibold">
          Pages
        </Link>
        {canCreate ? (
          <Link
            href="/wiki/new"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="New page"
          >
            <Plus className="size-4" />
          </Link>
        ) : null}
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {tree.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            No pages yet.
          </p>
        ) : (
          <ul>
            {tree.map((node) => (
              <TreeRow key={node.id} node={node} depth={0} />
            ))}
          </ul>
        )}
      </nav>
    </div>
  );
}
