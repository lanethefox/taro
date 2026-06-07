import { requireSession } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";

/**
 * Authed application shell: sidebar nav + topbar. `requireSession` redirects
 * unauthenticated users to /login (defense in depth alongside middleware) and
 * provisions the profile on first sign-in. Users whose role is still `pending`
 * get an access-requested screen instead of the app.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, user } = await requireSession();

  if (profile.role === "pending") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-grain p-6">
        <div className="tile max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Access requested
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({user.email}) is signed in but waiting for approval.
            The owner will grant you access. Check back once they do.
          </p>
          <form action={signOut} className="mt-6">
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    );
  }

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
