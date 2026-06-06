import { Search } from "lucide-react";
import Link from "next/link";

import { MobileNav } from "@/components/shell/mobile-nav";
import { UserMenu } from "@/components/shell/user-menu";

export function Topbar({
  displayName,
  avatarUrl,
  role,
}: {
  displayName: string;
  avatarUrl?: string | null;
  role: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur md:gap-4 md:px-6">
      <MobileNav />
      <Link
        href="/search"
        className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span>Search the graph…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </Link>

      <UserMenu displayName={displayName} avatarUrl={avatarUrl} role={role} />
    </header>
  );
}
