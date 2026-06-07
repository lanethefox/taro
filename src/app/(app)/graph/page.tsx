import { Waypoints } from "lucide-react";

import { getKnowledgeGraph } from "@/db/queries/graph";
import { getSessionContext, isOwner } from "@/lib/auth";
import { forceLayout } from "@/lib/graph/force-layout";
import { KnowledgeGraphView } from "@/components/graph/knowledge-graph";

export const metadata = { title: "Graph" };

export default async function GraphPage() {
  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  const graph = await getKnowledgeGraph(owner);
  const layout = forceLayout(graph.nodes, graph.edges);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Waypoints className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Graph</h1>
            <p className="text-sm text-muted-foreground">
              The whole graph. Every node and the links between them.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {graph.nodes.length} {graph.nodes.length === 1 ? "node" : "nodes"} ·{" "}
          {graph.edges.length} {graph.edges.length === 1 ? "link" : "links"}
        </span>
      </header>

      {graph.nodes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nothing to graph yet. Create some pages, posts, or catalog nodes and
            link them up.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 p-4">
          <KnowledgeGraphView graph={graph} layout={layout} />
        </div>
      )}
    </div>
  );
}
