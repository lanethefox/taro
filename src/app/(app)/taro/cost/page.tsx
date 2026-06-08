import { getCostReport, listCostableNodes } from "@/db/queries/cost";
import { getSessionContext, isOwner } from "@/lib/auth";
import { CostDashboard } from "@/components/taro/cost-dashboard";

export const metadata = { title: "Cost — Taro" };

export default async function CostPage() {
  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  const [report, nodes] = await Promise.all([
    getCostReport({ includePrivate: owner }),
    listCostableNodes(),
  ]);

  return <CostDashboard report={report} nodes={nodes} owner={owner} />;
}
