import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Network } from "lucide-react";

import { listModels } from "@/db/queries/catalog";
import { getDiagramData } from "@/db/queries/erd";
import { getSessionContext, isOwner } from "@/lib/auth";
import { ErdCanvas, type CatalogModelOption } from "@/components/graph/erd-canvas";
import { ErdExportMenu } from "@/components/graph/erd-export-menu";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Diagram" };

export default async function DiagramPage({
  params,
}: {
  params: Promise<{ diagramId: string }>;
}) {
  const { diagramId } = await params;

  const [data, ctx, allModels] = await Promise.all([
    getDiagramData(diagramId),
    getSessionContext(),
    listModels(),
  ]);
  if (!data) notFound();

  const owner = isOwner(ctx);
  if (!owner && data.diagram.visibility === "private") notFound();

  // Catalog models not yet placed (owner sees all; viewers can't add anyway).
  const placed = new Set(data.models.map((m) => m.modelId));
  const available: CatalogModelOption[] = allModels
    .filter((m) => !placed.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, layer: m.layer }));

  const relCount = data.relationships.length;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            size="icon-sm"
            variant="ghost"
            render={<Link href="/erd" aria-label="Back to diagrams" />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Network className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {data.diagram.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.models.length}{" "}
              {data.models.length === 1 ? "model" : "models"} · {relCount}{" "}
              {relCount === 1 ? "relationship" : "relationships"}
            </p>
          </div>
        </div>
        <ErdExportMenu diagramId={data.diagram.id} />
      </header>

      {data.models.length === 0 && !owner ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            This diagram has no models yet.
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 p-4">
          <ErdCanvas data={data} editable={owner} available={available} />
        </div>
      )}
    </div>
  );
}
