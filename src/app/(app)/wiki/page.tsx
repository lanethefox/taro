import Link from "next/link";
import { BookOpen, FileText, Hash, Plus } from "lucide-react";

import { listPages } from "@/db/queries/pages";
import { getSessionContext, isOwner } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function WikiIndexPage() {
  const [pages, ctx] = await Promise.all([listPages(), getSessionContext()]);
  const owner = isOwner(ctx);
  const visible = owner ? pages : pages.filter((p) => p.visibility !== "private");

  const recent = [...visible]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 12);
  const concepts = visible.filter((p) => p.kind === "concept");

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Wiki</h1>
            <p className="text-sm text-muted-foreground">
              Your reference knowledge — linked into one graph.
            </p>
          </div>
        </div>
        {owner ? (
          <Button render={<Link href="/wiki/new" />}>
            <Plus className="size-4" />
            New page
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No pages yet.
            {owner ? " Create your first one to get started." : ""}
          </p>
          {owner ? (
            <Button className="mt-4" render={<Link href="/wiki/new" />}>
              <Plus className="size-4" />
              New page
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Recently updated
            </h2>
            <ul className="divide-y rounded-lg border">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/wiki/${p.slug}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50"
                  >
                    {p.kind === "concept" ? (
                      <Hash className="size-4 shrink-0 text-primary/70" />
                    ) : (
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-medium">{p.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {concepts.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Concept pages — strategy library
              </h2>
              <div className="flex flex-wrap gap-2">
                {concepts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/wiki/${p.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm hover:bg-muted"
                  >
                    <Hash className="size-3.5 text-primary/70" />
                    {p.title}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
