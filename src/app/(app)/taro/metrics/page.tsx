import { getSemanticLayer } from "@/db/queries/metrics";
import { getSemanticGovernance } from "@/db/queries/semantics";
import { getSessionContext, isOwner } from "@/lib/auth";
import { SemanticLayerView } from "@/components/taro/semantic-layer";

export const metadata = { title: "Semantic layer — Taro" };

export default async function MetricsPage() {
  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  const [layer, gov] = await Promise.all([
    getSemanticLayer({ includePrivate: owner }),
    getSemanticGovernance({ includePrivate: owner }),
  ]);
  return <SemanticLayerView layer={layer} coverage={gov.coverage} />;
}
