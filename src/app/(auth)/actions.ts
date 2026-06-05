"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Provider } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase";

/** Kick off an OAuth flow with Google or GitHub. */
export async function signInWith(provider: Provider, next = "/wiki") {
  const supabase = await createServerSupabase();
  const headerList = await headers();
  const origin = headerList.get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "oauth")}`);
  }

  redirect(data.url);
}

export async function signInWithGoogle(next?: string) {
  await signInWith("google", next);
}

export async function signInWithGitHub(next?: string) {
  await signInWith("github", next);
}

/** Sign out and return to the login page. */
export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
