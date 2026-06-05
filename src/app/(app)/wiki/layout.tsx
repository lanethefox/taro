import { listPages } from "@/db/queries/pages";
import { getSessionContext, isOwner } from "@/lib/auth";
import { PageTree } from "@/components/wiki/page-tree";

export default async function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pages, ctx] = await Promise.all([listPages(), getSessionContext()]);
  const canCreate = isOwner(ctx);

  // Viewers only see non-private pages in the tree (RLS-equivalent at the UI).
  const visible = canCreate
    ? pages
    : pages.filter((p) => p.visibility !== "private");

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar/50 lg:block">
        <PageTree pages={visible} canCreate={canCreate} />
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
