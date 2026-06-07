import Link from "next/link";
import { BookOpen, FileText, FolderTree, Hash, Plus } from "lucide-react";

import { listPages } from "@/db/queries/pages";
import { getSessionContext, isOwner } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { buildTree } from "@/components/wiki/tree";

export default async function WikiIndexPage() {
  const [pages, ctx] = await Promise.all([listPages(), getSessionContext()]);
  const owner = isOwner(ctx);
  const visible = owner ? pages : pages.filter((p) => p.visibility !== "private");

  const recent = [...visible]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 12);
  const tree = buildTree(visible);

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
              Your reference notes, all linked together.
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

          {tree.map((root) => (
            <section key={root.id}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                <Link
                  href={`/wiki/${root.slug}`}
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  <BookOpen className="size-4 text-primary/70" />
                  {root.title}
                </Link>
              </h2>
              {root.children.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {root.children.map((c) => (
                    <Link
                      key={c.id}
                      href={`/wiki/${c.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm hover:bg-muted"
                      title={
                        c.children.length > 0
                          ? `${c.children.length} pages`
                          : undefined
                      }
                    >
                      {c.children.length > 0 ? (
                        <FolderTree className="size-3.5 text-primary/70" />
                      ) : c.kind === "concept" ? (
                        <Hash className="size-3.5 text-primary/70" />
                      ) : (
                        <FileText className="size-3.5 text-muted-foreground" />
                      )}
                      {c.title}
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
