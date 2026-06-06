import Link from "next/link";

import { NavList } from "@/components/shell/nav-list";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/wiki" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            t
          </span>
          <span className="text-base font-semibold tracking-tight">taro</span>
        </Link>
      </div>

      <NavList />

      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        analytics-engineering knowledge graph
      </div>
    </aside>
  );
}
