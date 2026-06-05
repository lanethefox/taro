import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Server-side Drizzle client over the Supabase pooler connection.
 *
 * This bypasses Row-Level Security (it connects as the database role from
 * `DATABASE_URL`), so it is for trusted server code only — Server Actions and
 * route handlers that have already authorized the request. Never import this
 * into a Client Component. User-scoped reads that must respect RLS should go
 * through the Supabase client in `@/lib/supabase`.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

// Reuse the postgres client across hot reloads in dev to avoid exhausting the
// connection pool.
const globalForDb = globalThis as unknown as {
  taroSql?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.taroSql ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.taroSql = client;
}

export const db = drizzle(client, { schema });

export { schema };
