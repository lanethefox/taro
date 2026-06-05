import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS — use only in trusted server code
 * (e.g. provisioning a profile on first sign-in). Never expose the key or this
 * client to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SECRET_KEY)!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
