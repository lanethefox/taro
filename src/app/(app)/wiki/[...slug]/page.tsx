import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash, Pencil } from "lucide-react";

import { getPageBySlug, listPages } from "@/db/queries/pages";
import { getSessionContext, isOwner } from "@/lib/auth";
import { getBacklinks } from "@/lib/links";
import { getTagsForNode } from "@/lib/tags";
import type { JSONContent } from "@/lib/content";
import { ContentView } from "@/components/editor/content-view";
import { Button } from "@/components/ui/button";
import { BacklinksPanel } from "@/components/wiki/backlinks-panel";
import { PageEditor } from "@/components/wiki/page-editor";

function canRead(
  visibility: "private" | "viewer" | "public",
  owner: boolean,
): boolean {
  return owner || visibility !== "private";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug.join("/"));
  return { title: page?.title ?? "Page" };
}

export default async function WikiPageView({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ slug }, { edit }] = await Promise.all([params, searchParams]);
  const page = await getPageBySlug(slug.join("/"));
  if (!page) notFound();

  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  if (!canRead(page.visibility, owner)) notFound();

  const allPages = await listPages();
  const visiblePages = owner
    ? allPages
    : allPages.filter((p) => p.visibility !== "private");

  // title (lowercased) → slug, for resolving wikilinks in this page's content.
  const linkMap: Record<string, string> = {};
  for (const p of visiblePages) linkMap[p.title.toLowerCase()] = p.slug;

  const pageTags = await getTagsForNode("page", page.id);
  const editing = owner && edit === "1";

  if (editing) {
    return (
      <PageEditor
        id={page.id}
        slug={page.slug}
        initialTitle={page.title}
        initialContent={page.content as JSONContent | null}
        initialParentId={page.parentId}
        initialVisibility={page.visibility}
        initialTags={pageTags.map((t) => t.name)}
        parentOptions={allPages.map((p) => ({ id: p.id, title: p.title }))}
        linkMap={linkMap}
      />
    );
  }

  const backlinks = await getBacklinks("page", page.id, {
    includePrivate: owner,
  });

  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          {page.kind === "concept" ? (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Hash className="size-3" />
              Concept
            </span>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {new Date(page.updatedAt).toLocaleString()} ·{" "}
            <span className="capitalize">{page.visibility}</span>
          </p>
        </div>
        {owner ? (
          <Button
            variant="outline"
            render={<Link href={`/wiki/${page.slug}?edit=1`} />}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        ) : null}
      </div>

      {pageTags.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {pageTags.map((t) => (
            <Link
              key={t.id}
              href={`/tags/${t.slug}`}
              className="rounded-full border bg-card px-2.5 py-0.5 text-xs hover:bg-muted"
            >
              #{t.name}
            </Link>
          ))}
        </div>
      ) : null}

      <ContentView content={page.content as JSONContent | null} linkMap={linkMap} />

      <BacklinksPanel backlinks={backlinks} />
    </article>
  );
}
