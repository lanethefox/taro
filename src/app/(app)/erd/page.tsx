import Link from "next/link";
import { Network, Plus, Table2 } from "lucide-react";

import { createDiagramAction } from "@/app/(app)/erd/actions";
import { listDiagrams } from "@/db/queries/erd";
import { getSessionContext, isOwner } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "ERD" };

export default async function ErdPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [diagrams, ctx, { error }] = await Promise.all([
    listDiagrams(),
    getSessionContext(),
    searchParams,
  ]);
  const owner = isOwner(ctx);
  const visible = owner
    ? diagrams
    : diagrams.filter((d) => d.visibility !== "private");

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Network className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ERD designer</h1>
          <p className="text-sm text-muted-foreground">
            Saved diagrams over your catalog models. The layout lives here, the
            tables stay in the catalog.
          </p>
        </div>
      </div>

      {owner ? (
        <form
          action={createDiagramAction}
          className="mb-8 flex items-end gap-2 rounded-lg border bg-card p-4"
        >
          <div className="flex-1 space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              New diagram
            </label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Orders mart ERD"
              required
            />
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </div>
          <Button type="submit">
            <Plus className="size-4" />
            Create
          </Button>
        </form>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No diagrams yet.{owner ? " Create one above to start placing models." : ""}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visible.map((d) => (
            <li key={d.id}>
              <Link
                href={`/erd/${d.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
              >
                <Network className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {d.name}
                  </span>
                  {d.description ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.description}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Table2 className="size-3.5" />
                  {d.modelCount}
                </span>
                {d.visibility !== "private" ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {d.visibility}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
