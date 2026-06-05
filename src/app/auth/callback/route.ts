import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";

/**
 * OAuth callback. Supabase redirects here with a `code` after Google/GitHub
 * sign-in; we exchange it for a session, provision the profile on first visit,
 * then send the user to `next` (default /wiki).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/wiki";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Provision the profile (first user => owner) before continuing.
      try {
        await getSessionContext();
      } catch (e) {
        console.error("Profile provisioning failed:", e);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base = isLocal
        ? origin
        : forwardedHost
          ? `https://${forwardedHost}`
          : origin;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
