import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash, Pencil, Table2 } from "lucide-react";

import { getModelById, listColumns } from "@/db/queries/catalog";
import { listPages } from "@/db/queries/pages";
import { getSessionContext, isOwner } from "@/lib/auth";
import { getBacklinks, getLinkedPages } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { BacklinksPanel } from "@/components/wiki/backlinks-panel";
import { ColumnsTable } from "@/components/catalog/columns-table";
import { ModelEditor } from "@/components/catalog/model-editor";

const layerLabel: Record<string, string> = {
  staging: "Staging",
  intermediate: "Intermediate",
  marts: "Marts",
};

export async function ModelDetail({
  id,
  edit,
}: {
  id: string;
  edit: boolean;
}) {
  const model = await getModelById(id);
  if (!model) notFound();

  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  if (!owner && model.visibility === "private") notFound();

  const columns = await listColumns("model", model.id);

  // ---- Edit mode (owner only) ----
  if (owner && edit) {
    const [allPages, linkedConcepts] = await Promise.all([
      listPages(),
      getLinkedPages("model", model.id, { includePrivate: true }),
    ]);
    const conceptOptions = allPages
      .filter((p) => p.kind === "concept")
      .map((p) => ({ id: p.id, title: p.title }));

    return (
      <ModelEditor
        id={model.id}
        initialName={model.name}
        initialDescription={model.description ?? ""}
        initialLayer={model.layer}
        initialMaterialization={model.materialization}
        initialGrain={model.grain ?? ""}
        initialSqlNotes={model.sqlNotes ?? ""}
        initialFreshnessSla={model.freshnessSla ?? ""}
        initialExpectedVolume={model.expectedVolume ?? ""}
        initialMonitoringNotes={model.monitoringNotes ?? ""}
        initialVisibility={model.visibility}
        initialColumns={columns.map((c) => ({
          key: c.id,
          id: c.id,
          name: c.name,
          dataType: c.dataType ?? "",
          description: c.description ?? "",
          isPk: c.isPk,
          isFk: c.isFk,
          testsInput: c.tests.join(", "),
        }))}
        conceptOptions={conceptOptions}
        initialConceptIds={linkedConcepts.map((p) => p.id)}
      />
    );
  }

  // ---- Reader ----
  const [concepts, backlinks] = await Promise.all([
    getLinkedPages("model", model.id, { includePrivate: owner }),
    getBacklinks("model", model.id, { includePrivate: owner }),
  ]);

  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Table2 className="size-3" />
            Model
          </span>
          <h1 className="font-mono text-3xl font-semibold tracking-tight">
            {model.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {layerLabel[model.layer] ?? model.layer}
            </span>
            <span>· {model.materialization}</span>
            {model.grain ? <span>· {model.grain}</span> : null}
            <span>· {model.visibility}</span>
          </p>
        </div>
        {owner ? (
          <Button
            variant="outline"
            render={<Link href={`/catalog/models/${model.id}?edit=1`} />}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        ) : null}
      </div>

      {model.description ? (
        <p className="mb-6 whitespace-pre-wrap text-sm text-muted-foreground">
          {model.description}
        </p>
      ) : null}

      <h2 className="mb-2 text-sm font-medium">Columns</h2>
      <ColumnsTable columns={columns} />

      {model.sqlNotes ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium">SQL notes</h2>
          <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-sm whitespace-pre-wrap">
            {model.sqlNotes}
          </pre>
        </div>
      ) : null}

      {model.freshnessSla || model.expectedVolume || model.monitoringNotes ? (
        <div className="mt-6 space-y-3 rounded-lg border bg-card p-5 text-sm">
          <p className="font-medium">Observation metadata</p>
          {model.freshnessSla ? (
            <p>
              <span className="text-muted-foreground">Freshness SLA — </span>
              {model.freshnessSla}
            </p>
          ) : null}
          {model.expectedVolume ? (
            <p>
              <span className="text-muted-foreground">Expected volume — </span>
              {model.expectedVolume}
            </p>
          ) : null}
          {model.monitoringNotes ? (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {model.monitoringNotes}
            </p>
          ) : null}
        </div>
      ) : null}

      {concepts.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Hash className="size-4" />
            Related concepts
          </h2>
          <ul className="flex flex-wrap gap-2">
            {concepts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/wiki/${c.slug}`}
                  className="rounded-full border bg-card px-3 py-1 text-sm hover:bg-muted"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <BacklinksPanel backlinks={backlinks} />
    </article>
  );
}
