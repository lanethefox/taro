import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client for Server Components, Server Actions, and route handlers.
 * Reads/writes the auth cookies so the session stays in sync. Reads via this
 * client run under the user's RLS context.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, where mutating
            // cookies is disallowed. Safe to ignore when middleware refreshes
            // the session.
          }
        },
      },
    },
  );
}
