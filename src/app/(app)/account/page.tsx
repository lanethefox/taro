import Link from "next/link";
import { Users } from "lucide-react";

import { requireSession, isOwner } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";

export const metadata = { title: "Account" };

const roleLabel: Record<string, string> = {
  owner: "Admin",
  viewer: "Viewer",
  pending: "Pending",
};

export default async function AccountPage() {
  const ctx = await requireSession();
  const { profile, user } = ctx;

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Account</h1>

      <div className="tile flex items-center gap-4 p-5">
        <Avatar className="size-12">
          {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
          <AvatarFallback>
            {(profile.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-medium">{profile.displayName ?? "Unnamed"}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
          {roleLabel[profile.role] ?? profile.role}
        </span>
      </div>

      {isOwner(ctx) ? (
        <Button className="mt-5" variant="outline" render={<Link href="/admin/users" />}>
          <Users className="size-4" />
          Manage users
        </Button>
      ) : null}

      <form action={signOut} className="mt-8 border-t pt-6">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
