import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type Role = "owner" | "viewer" | "pending";

export type ManagedUser = {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: Role;
  avatarUrl: string | null;
  createdAt: string | null;
};

const roleRank: Record<Role, number> = { pending: 0, viewer: 1, owner: 2 };

/** All accounts with their role + email, for the owner's user-management page. */
export async function listUsers(): Promise<ManagedUser[]> {
  const admin = createAdminClient();
  const [{ data: profiles }, usersRes] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, display_name, role, avatar_url, created_at"),
    admin.auth.admin.listUsers(),
  ]);

  const emailById = new Map(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? null] as const),
  );

  return (profiles ?? [])
    .map((p) => ({
      userId: p.user_id as string,
      displayName: (p.display_name as string | null) ?? null,
      email: emailById.get(p.user_id as string) ?? null,
      role: p.role as Role,
      avatarUrl: (p.avatar_url as string | null) ?? null,
      createdAt: (p.created_at as string | null) ?? null,
    }))
    .sort(
      (a, b) =>
        roleRank[a.role] - roleRank[b.role] ||
        (a.displayName ?? a.email ?? "").localeCompare(b.displayName ?? b.email ?? ""),
    );
}

/** Set a user's role (owner-only; caller must authorize). */
export async function setUserRole(userId: string, role: Role): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
