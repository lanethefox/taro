import Link from "next/link";
import { Boxes, Database, Plus, Table2 } from "lucide-react";

import type { ModelListItem, SourceListItem } from "@/db/queries/catalog";
import { Button } from "@/components/ui/button";

const layerLabel: Record<string, string> = {
  staging: "Staging",
  intermediate: "Intermediate",
  marts: "Marts",
};

function VisibilityDot({ visibility }: { visibility: string }) {
  if (visibility === "private") return null;
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {visibility}
    </span>
  );
}

export function CatalogList({
  models,
  sources,
  owner,
}: {
  models: ModelListItem[];
  sources: SourceListItem[];
  owner: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Boxes className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data catalog</h1>
          <p className="text-sm text-muted-foreground">
            Models, sources, and columns — with tests and observation metadata.
          </p>
        </div>
      </div>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Table2 className="size-4" />
            Models
            <span className="rounded-full bg-muted px-1.5 text-xs">
              {models.length}
            </span>
          </h2>
          {owner ? (
            <Button size="sm" variant="outline" render={<Link href="/catalog/models/new" />}>
              <Plus className="size-4" />
              New model
            </Button>
          ) : null}
        </div>
        {models.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No models yet.{owner ? " Add the first one." : ""}
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {models.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/catalog/models/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">
                    {m.name}
                  </span>
                  {m.grain ? (
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                      {m.grain}
                    </span>
                  ) : null}
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {layerLabel[m.layer] ?? m.layer}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {m.materialization}
                  </span>
                  <VisibilityDot visibility={m.visibility} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Database className="size-4" />
            Sources
            <span className="rounded-full bg-muted px-1.5 text-xs">
              {sources.length}
            </span>
          </h2>
          {owner ? (
            <Button size="sm" variant="outline" render={<Link href="/catalog/sources/new" />}>
              <Plus className="size-4" />
              New source
            </Button>
          ) : null}
        </div>
        {sources.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No sources yet.{owner ? " Add the first one." : ""}
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {sources.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/catalog/sources/${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">
                    {s.name}
                  </span>
                  {s.system ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {s.system}
                    </span>
                  ) : null}
                  <VisibilityDot visibility={s.visibility} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
