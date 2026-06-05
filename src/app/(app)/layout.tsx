import { requireSession } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

/**
 * Authed application shell: sidebar nav + topbar. `requireSession` redirects
 * unauthenticated users to /login (defense in depth alongside middleware) and
 * provisions the profile on first sign-in.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireSession();

  return (
    <Providers>
      <div className="flex h-svh overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            displayName={profile.displayName ?? "Anonymous"}
            avatarUrl={profile.avatarUrl}
            role={profile.role}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
