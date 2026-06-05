import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Server-side Drizzle client over the Supabase pooler connection.
 *
 * This connects as the role in `DATABASE_URL` and therefore bypasses RLS — for
 * trusted server code only (Server Actions / route handlers that already
 * authorized the request). Never import this into a Client Component.
 *
 * Initialization is lazy: importing this module never touches the network or
 * throws, so `next build` succeeds even before env vars are wired. The
 * connection (and the missing-env error) is created on first query.
 */
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  taroSql?: ReturnType<typeof postgres>;
  taroDb?: DrizzleDb;
};

function initDb(): DrizzleDb {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local (local) or add it in your host's env settings (deploy).",
    );
  }

  // `prepare: false` is required for Supabase's transaction pooler (pgbouncer).
  const client =
    globalForDb.taroSql ?? postgres(connectionString, { prepare: false });
  globalForDb.taroSql = client;

  return drizzle(client, { schema });
}

/**
 * Lazy proxy: the real Drizzle client is built on first property access and
 * cached on `globalThis` (so warm serverless invocations and dev hot-reloads
 * reuse a single pool).
 */
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const instance = (globalForDb.taroDb ??= initDb());
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
