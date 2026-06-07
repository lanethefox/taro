"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/auth";
import { setUserRole } from "@/lib/users";

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "viewer", "pending"]),
});

export type SetRoleResult = { ok: true } | { ok: false; error: string };

/** Owner-only: approve / change / revoke a user's role. */
export async function setUserRoleAction(input: {
  userId: string;
  role: "owner" | "viewer" | "pending";
}): Promise<SetRoleResult> {
  const ctx = await requireOwner();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  // Don't let the owner lock themselves out of admin.
  if (parsed.data.userId === ctx.user.id && parsed.data.role !== "owner") {
    return { ok: false, error: "You can't change your own admin role." };
  }

  try {
    await setUserRole(parsed.data.userId, parsed.data.role);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
