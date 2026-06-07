import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";

import { listRevisions } from "@/db/queries/revisions";
import { listPages } from "@/db/queries/pages";
import { getSessionContext, isOwner } from "@/lib/auth";
import { ContentView } from "@/components/editor/content-view";

export const metadata = { title: "History" };

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (type !== "page" && type !== "post") notFound();

  const ctx = await getSessionContext();
  if (!isOwner(ctx)) notFound(); // history is an owner authoring tool

  const [revisions, allPages] = await Promise.all([
    listRevisions(type, id),
    listPages(),
  ]);
  const linkMap: Record<string, string> = {};
  for (const p of allPages) linkMap[p.title.toLowerCase()] = p.slug;

  const backHref =
    type === "page" && revisions[0]
      ? "/wiki"
      : type === "post"
        ? "/blog"
        : "/wiki";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <History className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground">
            {revisions.length} saved {revisions.length === 1 ? "version" : "versions"}
            {revisions[0] ? ` · ${revisions[0].title ?? "Untitled"}` : ""}
          </p>
        </div>
      </div>

      {revisions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No history yet — a version is saved each time you edit.
        </div>
      ) : (
        <ol className="space-y-3">
          {revisions.map((r, i) => (
            <li key={r.id} className="rounded-lg border bg-card">
              <details open={i === 0}>
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm">
                  <span className="font-medium">
                    {i === 0 ? "Latest" : `Version ${revisions.length - i}`}
                  </span>
                  <span className="text-muted-foreground">{r.title ?? "Untitled"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </summary>
                <div className="border-t px-4 py-3">
                  <ContentView content={r.content} linkMap={linkMap} />
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
