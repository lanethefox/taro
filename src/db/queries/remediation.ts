import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { domains, models, remediations, sources } from "@/db/schema";
import { CHECKS } from "@/lib/conformance/checks";
import { getConformanceReport } from "@/db/queries/conformance";

export type RemediationStatus = "open" | "in_progress" | "done" | "wontfix";

export type RemediationView = {
  id: string;
  nodeType: "model" | "source";
  nodeId: string;
  nodeName: string;
  checkKey: string | null;
  checkTitle: string | null;
  title: string;
  status: RemediationStatus;
  domainId: string | null;
  domainName: string | null;
  note: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

const checkTitleByKey = new Map(CHECKS.map((c) => [c.key, c.title]));

async function nodeNameMaps(): Promise<{
  models: Map<string, string>;
  sources: Map<string, string>;
  domains: Map<string, string>;
}> {
  const [m, s, d] = await Promise.all([
    db.select({ id: models.id, name: models.name }).from(models),
    db.select({ id: sources.id, name: sources.name }).from(sources),
    db.select({ id: domains.id, name: domains.name }).from(domains),
  ]);
  return {
    models: new Map(m.map((x) => [x.id, x.name])),
    sources: new Map(s.map((x) => [x.id, x.name])),
    domains: new Map(d.map((x) => [x.id, x.name])),
  };
}

export async function listRemediations(): Promise<RemediationView[]> {
  const [rows, names] = await Promise.all([
    db.select().from(remediations).orderBy(desc(remediations.createdAt)),
    nodeNameMaps(),
  ]);
  return rows.map((r) => {
    const nodeType = (r.nodeType === "source" ? "source" : "model") as "model" | "source";
    const nodeName =
      (nodeType === "model" ? names.models.get(r.nodeId) : names.sources.get(r.nodeId)) ??
      "(deleted)";
    return {
      id: r.id,
      nodeType,
      nodeId: r.nodeId,
      nodeName,
      checkKey: r.checkKey,
      checkTitle: r.checkKey ? checkTitleByKey.get(r.checkKey) ?? null : null,
      title: r.title,
      status: r.status as RemediationStatus,
      domainId: r.domainId,
      domainName: r.domainId ? names.domains.get(r.domainId) ?? null : null,
      note: r.note,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
    };
  });
}

/** Keys (`type:id:check`) with an open or in-progress remediation — for dedupe. */
export async function getActiveRemediationKeys(): Promise<Set<string>> {
  const rows = await db
    .select({
      nodeType: remediations.nodeType,
      nodeId: remediations.nodeId,
      checkKey: remediations.checkKey,
      status: remediations.status,
    })
    .from(remediations)
    .where(inArray(remediations.status, ["open", "in_progress"]));
  const set = new Set<string>();
  for (const r of rows) if (r.checkKey) set.add(`${r.nodeType}:${r.nodeId}:${r.checkKey}`);
  return set;
}

export async function createRemediation(input: {
  nodeType: "model" | "source";
  nodeId: string;
  checkKey: string | null;
  title: string;
  domainId: string | null;
}): Promise<void> {
  await db.insert(remediations).values({
    nodeType: input.nodeType,
    nodeId: input.nodeId,
    checkKey: input.checkKey,
    title: input.title,
    domainId: input.domainId,
    status: "open",
  });
}

export async function setRemediationStatus(
  id: string,
  status: RemediationStatus,
): Promise<void> {
  const done = status === "done" || status === "wontfix";
  await db
    .update(remediations)
    .set({ status, resolvedAt: done ? new Date() : null, updatedAt: new Date() })
    .where(eq(remediations.id, id));
}

/**
 * Auto-close: recompute conformance and mark any open/in-progress remediation
 * whose check now passes as done. Returns the number closed.
 */
export async function reconcileRemediations(includePrivate: boolean): Promise<number> {
  const [open, report] = await Promise.all([
    db
      .select({ id: remediations.id, nodeType: remediations.nodeType, nodeId: remediations.nodeId, checkKey: remediations.checkKey })
      .from(remediations)
      .where(inArray(remediations.status, ["open", "in_progress"])),
    getConformanceReport({ includePrivate }),
  ]);

  const passing = new Set<string>();
  for (const n of report.nodes) {
    for (const r of n.results) {
      if (r.status === "pass") passing.add(`${n.type}:${n.id}:${r.key}`);
    }
  }

  const toClose = open.filter(
    (r) => r.checkKey && passing.has(`${r.nodeType}:${r.nodeId}:${r.checkKey}`),
  );
  if (toClose.length === 0) return 0;
  await db
    .update(remediations)
    .set({ status: "done", resolvedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        inArray(
          remediations.id,
          toClose.map((r) => r.id),
        ),
        inArray(remediations.status, ["open", "in_progress"]),
      ),
    );
  return toClose.length;
}

/**
 * Auto-catch: create remediations for models whose SQL fails the `clean_sql`
 * check (the legacy/decomposition candidates), deduped against active ones.
 * Returns the number created.
 */
export async function generateLegacyRemediations(includePrivate: boolean): Promise<number> {
  const [report, active] = await Promise.all([
    getConformanceReport({ includePrivate }),
    getActiveRemediationKeys(),
  ]);
  const toCreate = report.nodes
    .filter(
      (n) =>
        n.type === "model" &&
        n.results.some((r) => r.key === "clean_sql" && r.status === "fail") &&
        !active.has(`model:${n.id}:clean_sql`),
    )
    .map((n) => ({
      nodeType: "model" as const,
      nodeId: n.id,
      checkKey: "clean_sql",
      title: `Decompose ${n.name}`,
      domainId: n.domainId,
      status: "open" as const,
    }));
  if (toCreate.length > 0) await db.insert(remediations).values(toCreate);
  return toCreate.length;
}
