import { MobileNav } from "@/components/shell/mobile-nav";
import { CommandPalette } from "@/components/shell/command-palette";
import { ThemeToggle } from "@/components/shell/theme-toggle";
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
      <CommandPalette />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu displayName={displayName} avatarUrl={avatarUrl} role={role} />
      </div>
    </header>
  );
}
