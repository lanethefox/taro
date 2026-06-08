"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/auth";
import {
  createRemediation,
  reconcileRemediations,
  setRemediationStatus,
} from "@/db/queries/remediation";

export type ActionResult = { ok: true } | { ok: false; error: string };

const createSchema = z.object({
  nodeType: z.enum(["model", "source"]),
  nodeId: z.string().uuid(),
  checkKey: z.string().max(60).nullable(),
  title: z.string().trim().min(1).max(300),
  domainId: z.string().uuid().nullable().optional(),
});

export async function createRemediationAction(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  await createRemediation({
    nodeType: parsed.data.nodeType,
    nodeId: parsed.data.nodeId,
    checkKey: parsed.data.checkKey,
    title: parsed.data.title,
    domainId: parsed.data.domainId ?? null,
  });
  revalidatePath("/taro/audit");
  revalidatePath("/taro/remediation");
  return { ok: true };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "done", "wontfix"]),
});

export async function setRemediationStatusAction(
  input: z.infer<typeof statusSchema>,
): Promise<ActionResult> {
  await requireOwner();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  await setRemediationStatus(parsed.data.id, parsed.data.status);
  revalidatePath("/taro/remediation");
  return { ok: true };
}

export type RecheckResult = { ok: true; closed: number } | { ok: false; error: string };

export async function recheckRemediationsAction(): Promise<RecheckResult> {
  await requireOwner();
  const closed = await reconcileRemediations(true);
  revalidatePath("/taro/remediation");
  revalidatePath("/taro/audit");
  return { ok: true, closed };
}
