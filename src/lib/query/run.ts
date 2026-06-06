import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * Owner query runner. SQL executes inside a **read-only** transaction with a
 * statement timeout, so the editor can never mutate the database and a runaway
 * query is bounded. GraphQL proxies to Supabase's pg_graphql endpoint.
 *
 * Callers must still authorize (requireOwner) before invoking these.
 */

export type SqlRunResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
};

const MAX_ROWS = 500;
const TIMEOUT_MS = 15_000;

export async function runSql(query: string): Promise<SqlRunResult> {
  const result = (await db.transaction(async (tx) => {
    // Order matters: READ ONLY must be set before the first data statement.
    await tx.execute(sql.raw("set transaction read only"));
    await tx.execute(sql.raw(`set local statement_timeout = '${TIMEOUT_MS}'`));
    return tx.execute(sql.raw(query));
  })) as unknown;

  const all = Array.isArray(result) ? (result as Record<string, unknown>[]) : [];
  const rows = all.slice(0, MAX_ROWS);
  return {
    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    rows,
    rowCount: all.length,
    truncated: all.length > MAX_ROWS,
  };
}

export type GraphqlResult = { data?: unknown; errors?: unknown };

export async function runGraphql(
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphqlResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL / service-role key are not configured.");
  }

  const res = await fetch(`${url}/graphql/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
    cache: "no-store",
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as GraphqlResult;
  } catch {
    throw new Error(
      `GraphQL endpoint returned HTTP ${res.status}: ${text.slice(0, 300)}`,
    );
  }
}
