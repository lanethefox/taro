import Link from "next/link";
import { notFound } from "next/navigation";
import { Database, Hash, Pencil } from "lucide-react";

import { getSourceById, listColumns } from "@/db/queries/catalog";
import { listPages } from "@/db/queries/pages";
import { getSessionContext, isOwner } from "@/lib/auth";
import { getBacklinks, getLinkedPages } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { BacklinksPanel } from "@/components/wiki/backlinks-panel";
import { ColumnsTable } from "@/components/catalog/columns-table";
import { SourceEditor } from "@/components/catalog/source-editor";

export async function SourceDetail({
  id,
  edit,
}: {
  id: string;
  edit: boolean;
}) {
  const source = await getSourceById(id);
  if (!source) notFound();

  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  if (!owner && source.visibility === "private") notFound();

  const columns = await listColumns("source", source.id);

  // ---- Edit mode (owner only) ----
  if (owner && edit) {
    const [allPages, linkedConcepts] = await Promise.all([
      listPages(),
      getLinkedPages("source", source.id, { includePrivate: true }),
    ]);
    const conceptOptions = allPages
      .filter((p) => p.kind === "concept")
      .map((p) => ({ id: p.id, title: p.title }));

    return (
      <SourceEditor
        id={source.id}
        initialName={source.name}
        initialDescription={source.description ?? ""}
        initialSystem={source.system ?? ""}
        initialGrain={source.grain ?? ""}
        initialFreshnessSla={source.freshnessSla ?? ""}
        initialExpectedVolume={source.expectedVolume ?? ""}
        initialMonitoringNotes={source.monitoringNotes ?? ""}
        initialVisibility={source.visibility}
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
    getLinkedPages("source", source.id, { includePrivate: owner }),
    getBacklinks("source", source.id, { includePrivate: owner }),
  ]);

  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Database className="size-3" />
            Source
          </span>
          <h1 className="font-mono text-3xl font-semibold tracking-tight">
            {source.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {source.system ? (
              <span className="font-medium text-foreground">{source.system}</span>
            ) : null}
            <span>{source.system ? "· " : ""}{source.visibility}</span>
          </p>
        </div>
        {owner ? (
          <Button
            variant="outline"
            render={<Link href={`/catalog/sources/${source.id}?edit=1`} />}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        ) : null}
      </div>

      {source.description ? (
        <p className="mb-5 whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
          {source.description}
        </p>
      ) : null}

      {source.grain ? (
        <p className="mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Grain
          </span>
          <span className="font-medium">{source.grain}</span>
        </p>
      ) : null}

      <h2 className="mb-2 text-sm font-medium">Columns</h2>
      <ColumnsTable columns={columns} />

      {source.freshnessSla || source.expectedVolume || source.monitoringNotes ? (
        <div className="mt-6 space-y-3 rounded-lg border bg-card p-5 text-sm">
          <p className="font-medium">Observation metadata</p>
          {source.freshnessSla ? (
            <p>
              <span className="text-muted-foreground">Freshness SLA — </span>
              {source.freshnessSla}
            </p>
          ) : null}
          {source.expectedVolume ? (
            <p>
              <span className="text-muted-foreground">Expected volume — </span>
              {source.expectedVolume}
            </p>
          ) : null}
          {source.monitoringNotes ? (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {source.monitoringNotes}
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
