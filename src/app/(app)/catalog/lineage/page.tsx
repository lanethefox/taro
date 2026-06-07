import Link from "next/link";
import { GitBranch, Plus } from "lucide-react";

import { listModelDependencies, listModels } from "@/db/queries/catalog";
import { getSessionContext, isOwner } from "@/lib/auth";
import { layoutDag } from "@/lib/graph/dag-layout";
import { LineageGraph } from "@/components/graph/lineage-graph";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Lineage" };

export default async function LineagePage() {
  const [models, deps, ctx] = await Promise.all([
    listModels(),
    listModelDependencies(),
    getSessionContext(),
  ]);
  const owner = isOwner(ctx);
  const visible = owner ? models : models.filter((m) => m.visibility !== "private");
  const layout = layoutDag(visible, deps);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GitBranch className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Lineage</h1>
            <p className="text-sm text-muted-foreground">
              Model → model dependencies as a directed graph.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {visible.length} {visible.length === 1 ? "model" : "models"} ·{" "}
          {layout.edges.length} {layout.edges.length === 1 ? "edge" : "edges"}
        </span>
      </header>

      {visible.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No models yet. Lineage shows up once you’ve defined some models and
              their dependencies.
            </p>
            {owner ? (
              <Button className="mt-4" render={<Link href="/catalog/models/new" />}>
                <Plus className="size-4" />
                New model
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 p-4">
          <LineageGraph layout={layout} />
        </div>
      )}
    </div>
  );
}
