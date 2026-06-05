import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase";
import type { Profile } from "@/db/schema";

export type SessionContext = {
  user: User;
  profile: Profile;
};

/** Current Supabase auth user, or null. Memoized per request. */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Fetches the caller's profile, provisioning one on first sign-in.
 *
 * The very first user to sign in becomes the `owner`; everyone after is a
 * `viewer` (SPEC §2). Provisioning uses the service-role client so it can both
 * count existing profiles and insert past RLS.
 */
export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
    const user = await getUser();
    if (!user) return null;

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return { user, profile: existing as Profile };
    }

    // No profile yet — provision one. First user ever => owner.
    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const role = (count ?? 0) === 0 ? "owner" : "viewer";
    const meta = user.user_metadata ?? {};

    const { data: created, error } = await admin
      .from("profiles")
      .insert({
        user_id: user.id,
        display_name: meta.full_name ?? meta.name ?? user.email ?? "Anonymous",
        avatar_url: meta.avatar_url ?? meta.picture ?? null,
        role,
      })
      .select("*")
      .single();

    if (error || !created) {
      throw new Error(`Failed to provision profile: ${error?.message}`);
    }

    return { user, profile: created as Profile };
  },
);

/** Require a signed-in user; redirect to /login otherwise. */
export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Require the owner role; redirect viewers home. */
export async function requireOwner(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (ctx.profile.role !== "owner") redirect("/wiki");
  return ctx;
}

export function isOwner(ctx: SessionContext | null): boolean {
  return ctx?.profile.role === "owner";
}
