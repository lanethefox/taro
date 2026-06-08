import { getConformanceReport } from "@/db/queries/conformance";
import { getPlatformOverview, listDomainsWithCounts } from "@/db/queries/taro";
import { getSessionContext, isOwner } from "@/lib/auth";
import { ControlCenter } from "@/components/taro/control-center";

export const metadata = { title: "Taro — control center" };

export default async function TaroPage() {
  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  const [overview, domains, report] = await Promise.all([
    getPlatformOverview(),
    listDomainsWithCounts(),
    getConformanceReport({ includePrivate: owner }),
  ]);

  return (
    <ControlCenter
      overview={overview}
      domains={domains}
      owner={owner}
      platformScore={report.platformScore}
      domainScores={report.domainScores}
    />
  );
}
