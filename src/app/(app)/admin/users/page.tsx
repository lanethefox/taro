import { notFound } from "next/navigation";
import { Users } from "lucide-react";

import { getSessionContext, isOwner } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { UsersTable } from "@/components/admin/users-table";

export const metadata = { title: "Users" };

export default async function UsersAdminPage() {
  const ctx = await getSessionContext();
  if (!isOwner(ctx)) notFound();

  const users = await listUsers();
  const pendingCount = users.filter((u) => u.role === "pending").length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Approve access requests and set who can see what.
            {pendingCount > 0 ? ` ${pendingCount} waiting.` : ""}
          </p>
        </div>
      </div>

      <UsersTable users={users} currentUserId={ctx!.user.id} />

      <p className="mt-6 text-xs text-muted-foreground">
        Admins see everything. Viewers see everything except private items.
        Pending users have no access until you approve them.
      </p>
    </div>
  );
}
