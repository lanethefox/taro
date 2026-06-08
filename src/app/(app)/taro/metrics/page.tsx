import { getSemanticGovernance } from "@/db/queries/semantics";
import { getSessionContext, isOwner } from "@/lib/auth";
import { SemanticGovernance } from "@/components/taro/semantic-governance";

export const metadata = { title: "Semantics — Taro" };

export default async function MetricsPage() {
  const ctx = await getSessionContext();
  const data = await getSemanticGovernance({ includePrivate: isOwner(ctx) });
  return <SemanticGovernance data={data} />;
}
