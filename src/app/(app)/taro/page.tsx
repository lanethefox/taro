import { getPlatformOverview, listDomainsWithCounts } from "@/db/queries/taro";
import { getSessionContext, isOwner } from "@/lib/auth";
import { ControlCenter } from "@/components/taro/control-center";

export const metadata = { title: "Taro — control center" };

export default async function TaroPage() {
  const [overview, domains, ctx] = await Promise.all([
    getPlatformOverview(),
    listDomainsWithCounts(),
    getSessionContext(),
  ]);

  return (
    <ControlCenter overview={overview} domains={domains} owner={isOwner(ctx)} />
  );
}
