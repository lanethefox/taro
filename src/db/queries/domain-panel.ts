import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { domains, pages } from "@/db/schema";
import {
  getConformanceReport,
  getConformanceTrend,
  type CheckMeta,
} from "@/db/queries/conformance";
import { getCostReport, type CostNode } from "@/db/queries/cost";
import { listRemediations, type RemediationView } from "@/db/queries/remediation";

export const CONFORMANCE_TARGET = 80;

export type DomainPanelNode = {
  type: "model" | "source";
  id: string;
  name: string;
  score: number;
  fails: number;
  warns: number;
};

export type DomainPanel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content: unknown;
  monthlyBudget: number | null;
  conceptSlug: string | null;
  score: number | null;
  nodes: DomainPanelNode[];
  failingChecks: { check: CheckMeta; count: number }[];
  cost: { actual: number; budget: number | null; byNode: CostNode[] };
  remediations: RemediationView[];
  trend: number[];
  definitionOfDone: { conformance: boolean; budget: boolean };
};

export async function getDomainPanel(
  slug: string,
  opts: { includePrivate?: boolean } = {},
): Promise<DomainPanel | null> {
  const includePrivate = opts.includePrivate ?? false;
  const [domain] = await db.select().from(domains).where(eq(domains.slug, slug)).limit(1);
  if (!domain) return null;

  const [conformance, cost, allRemediations, trendPoints, conceptRow] = await Promise.all([
    getConformanceReport({ includePrivate }),
    getCostReport({ includePrivate }),
    listRemediations(),
    getConformanceTrend(),
    domain.conceptPageId
      ? db.select({ slug: pages.slug }).from(pages).where(eq(pages.id, domain.conceptPageId)).limit(1)
      : Promise.resolve([] as { slug: string }[]),
  ]);

  const checkByKey = new Map(conformance.checks.map((c) => [c.key, c]));

  const armNodes = conformance.nodes.filter((n) => n.domainId === domain.id);
  const nodes: DomainPanelNode[] = armNodes
    .map((n) => ({
      type: n.type,
      id: n.id,
      name: n.name,
      score: n.score,
      fails: n.results.filter((r) => r.status === "fail").length,
      warns: n.results.filter((r) => r.status === "warn").length,
    }))
    .sort((a, b) => a.score - b.score);

  const checkCounts = new Map<string, number>();
  for (const n of armNodes)
    for (const r of n.results)
      if (r.status === "fail" || r.status === "warn")
        checkCounts.set(r.key, (checkCounts.get(r.key) ?? 0) + 1);
  const failingChecks = [...checkCounts.entries()]
    .map(([key, count]) => ({ check: checkByKey.get(key)!, count }))
    .filter((x) => x.check)
    .sort((a, b) => b.count - a.count);

  const arm = cost.arms.find((a) => a.domainId === domain.id);
  const byNode = cost.nodes
    .filter((n) => n.domainId === domain.id && n.cost > 0)
    .sort((a, b) => b.cost - a.cost);
  const actual = arm?.actual ?? 0;
  const budget = domain.monthlyBudget === null ? null : Number(domain.monthlyBudget);

  const remediationsForArm = allRemediations.filter(
    (r) => r.domainId === domain.id && (r.status === "open" || r.status === "in_progress"),
  );

  const score = conformance.domainScores[domain.id] ?? null;
  const trend = trendPoints
    .map((p) => p.byDomain[domain.id])
    .filter((v): v is number => typeof v === "number");

  return {
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    description: domain.description,
    content: domain.content,
    monthlyBudget: budget,
    conceptSlug: conceptRow[0]?.slug ?? null,
    score,
    nodes,
    failingChecks,
    cost: { actual, budget, byNode },
    remediations: remediationsForArm,
    trend,
    definitionOfDone: {
      conformance: score !== null && score >= CONFORMANCE_TARGET,
      budget: budget === null || actual <= budget,
    },
  };
}

export async function listDomainSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: domains.slug }).from(domains);
  return rows.map((r) => r.slug);
}
