"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { setUserRoleAction } from "@/app/(app)/admin/actions";
import type { ManagedUser, Role } from "@/lib/users";

const roleStyle: Record<Role, string> = {
  owner: "bg-primary/15 text-primary",
  viewer: "bg-muted text-muted-foreground",
  pending: "bg-wheat/20 text-foreground",
};

export function UsersTable({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setRole(userId: string, role: Role) {
    setError(null);
    start(async () => {
      const res = await setUserRoleAction({ userId, role });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="divide-y rounded-lg border">
        {users.map((u) => {
          const isSelf = u.userId === currentUserId;
          return (
            <li key={u.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar className="size-8">
                {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-xs">
                  {(u.displayName ?? u.email ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {u.displayName ?? "Unnamed"} {isSelf ? "(you)" : ""}
                </div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleStyle[u.role]}`}
              >
                {u.role}
              </span>

              <div className="flex shrink-0 gap-1.5">
                {isSelf ? null : (
                  <>
                    {u.role === "pending" ? (
                      <Button size="sm" disabled={pending} onClick={() => setRole(u.userId, "viewer")}>
                        Approve
                      </Button>
                    ) : null}
                    {u.role !== "owner" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setRole(u.userId, "owner")}
                      >
                        Make admin
                      </Button>
                    ) : null}
                    {u.role !== "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setRole(u.userId, "pending")}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
