import "server-only";

import { db } from "@/db";
import { domains } from "@/db/schema";
import { getConformanceReport, type CheckMeta } from "@/db/queries/conformance";
import { getActiveRemediationKeys } from "@/db/queries/remediation";

export type FindingNode = {
  nodeType: "model" | "source";
  nodeId: string;
  name: string;
  domainId: string | null;
  domainName: string | null;
  status: "fail" | "warn";
  tracked: boolean;
};

export type FindingGroup = {
  check: CheckMeta;
  fails: number;
  warns: number;
  nodes: FindingNode[];
};

export type AuditReport = {
  groups: FindingGroup[];
  totalFindings: number;
};

/** Turn the conformance report's failing/warn results into actionable findings. */
export async function getAuditReport(
  opts: { includePrivate?: boolean } = {},
): Promise<AuditReport> {
  const includePrivate = opts.includePrivate ?? false;
  const [report, active, domainRows] = await Promise.all([
    getConformanceReport({ includePrivate }),
    getActiveRemediationKeys(),
    db.select({ id: domains.id, name: domains.name }).from(domains),
  ]);
  const domainName = new Map(domainRows.map((d) => [d.id, d.name]));
  const checkByKey = new Map(report.checks.map((c) => [c.key, c]));

  const groups = new Map<string, FindingGroup>();
  let total = 0;

  for (const node of report.nodes) {
    for (const r of node.results) {
      if (r.status !== "fail" && r.status !== "warn") continue;
      const check = checkByKey.get(r.key);
      if (!check) continue;
      total++;
      let group = groups.get(r.key);
      if (!group) {
        group = { check, fails: 0, warns: 0, nodes: [] };
        groups.set(r.key, group);
      }
      if (r.status === "fail") group.fails++;
      else group.warns++;
      group.nodes.push({
        nodeType: node.type,
        nodeId: node.id,
        name: node.name,
        domainId: node.domainId,
        domainName: node.domainId ? domainName.get(node.domainId) ?? null : null,
        status: r.status,
        tracked: active.has(`${node.type}:${node.id}:${r.key}`),
      });
    }
  }

  // Errors first, then by count.
  const ordered = [...groups.values()].sort((a, b) => {
    if (a.check.severity !== b.check.severity) return a.check.severity === "error" ? -1 : 1;
    return b.fails + b.warns - (a.fails + a.warns);
  });

  return { groups: ordered, totalFindings: total };
}
