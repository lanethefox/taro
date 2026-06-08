"use server";

import { revalidatePath } from "next/cache";

import { snapshotConformance } from "@/db/queries/conformance";
import { requireOwner } from "@/lib/auth";

export type SnapshotResult = { ok: true; count: number } | { ok: false; error: string };

/** Persist a conformance snapshot (for the trend). Owner-only. */
export async function snapshotConformanceAction(): Promise<SnapshotResult> {
  await requireOwner();
  const { count } = await snapshotConformance(true);
  revalidatePath("/taro");
  return { ok: true, count };
}
