import Link from "next/link";
import { FileText, Plus, ScrollText } from "lucide-react";

import type { PostListItem } from "@/db/queries/posts";
import { Button } from "@/components/ui/button";

export function PostList({
  posts,
  kind,
  owner,
}: {
  posts: PostListItem[];
  kind: "blog" | "decision";
  owner: boolean;
}) {
  const basePath = kind === "decision" ? "/decisions" : "/blog";
  const Icon = kind === "decision" ? ScrollText : FileText;
  const title = kind === "decision" ? "Decision log" : "Blog";
  const blurb =
    kind === "decision"
      ? "Architecture decision records with a navigable history."
      : "Daily analytics-engineering work, turned into shareable writing.";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{blurb}</p>
          </div>
        </div>
        {owner ? (
          <Button render={<Link href={`${basePath}/new`} />}>
            <Plus className="size-4" />
            {kind === "decision" ? "New decision" : "New post"}
          </Button>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nothing here yet.
          {owner ? " Create the first one." : ""}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`${basePath}/${p.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-xs " +
                    (p.status === "published"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {p.status}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
