import { getConformanceReport } from "@/db/queries/conformance";
import { listDomainsWithCounts } from "@/db/queries/taro";
import { getSessionContext, isOwner } from "@/lib/auth";
import { ConformanceScorecard } from "@/components/taro/conformance-scorecard";

export const metadata = { title: "Conformance — Taro" };

export default async function ConformancePage() {
  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  const [report, domains] = await Promise.all([
    getConformanceReport({ includePrivate: owner }),
    listDomainsWithCounts(),
  ]);
  const domainNames = Object.fromEntries(domains.map((d) => [d.id, d.name]));

  return (
    <ConformanceScorecard
      platformScore={report.platformScore}
      nodes={report.nodes}
      checks={report.checks}
      domainNames={domainNames}
    />
  );
}
