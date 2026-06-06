"use server";

import { requireOwner } from "@/lib/auth";
import {
  runGraphql,
  runSql,
  type GraphqlResult,
  type SqlRunResult,
} from "@/lib/query/run";

export type SqlActionResult =
  | { ok: true; data: SqlRunResult }
  | { ok: false; error: string };

export async function runSqlAction(query: string): Promise<SqlActionResult> {
  await requireOwner();
  const q = query.trim();
  if (!q) return { ok: false, error: "Enter a query." };
  try {
    return { ok: true, data: await runSql(q) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type GqlActionResult =
  | { ok: true; result: GraphqlResult }
  | { ok: false; error: string };

export async function runGraphqlAction(query: string): Promise<GqlActionResult> {
  await requireOwner();
  const q = query.trim();
  if (!q) return { ok: false, error: "Enter a query." };
  try {
    return { ok: true, result: await runGraphql(q) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
