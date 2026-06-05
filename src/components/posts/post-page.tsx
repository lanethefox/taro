import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ScrollText } from "lucide-react";

import { listPages } from "@/db/queries/pages";
import {
  getDecisionMeta,
  getPostBySlug,
  listPosts,
} from "@/db/queries/posts";
import { getSessionContext, isOwner } from "@/lib/auth";
import type { JSONContent } from "@/lib/content";
import { getBacklinks } from "@/lib/links";
import { getTagsForNode } from "@/lib/tags";
import { ContentView } from "@/components/editor/content-view";
import { Button } from "@/components/ui/button";
import { BacklinksPanel } from "@/components/wiki/backlinks-panel";
import { ExportButton } from "@/components/posts/export-button";
import { PostEditor, type DecisionFields } from "@/components/posts/post-editor";

const statusLabel: Record<string, string> = {
  proposed: "Proposed",
  accepted: "Accepted",
  superseded: "Superseded",
};

export async function PostPage({
  slug,
  kind,
  edit,
}: {
  slug: string;
  kind: "blog" | "decision";
  edit: boolean;
}) {
  const post = await getPostBySlug(slug);
  if (!post || post.kind !== kind) notFound();

  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  if (!owner && post.visibility === "private") notFound();

  const basePath = kind === "decision" ? "/decisions" : "/blog";

  const [allPages, tags, meta] = await Promise.all([
    listPages(),
    getTagsForNode("post", post.id),
    kind === "decision" ? getDecisionMeta(post.id) : Promise.resolve(undefined),
  ]);

  const visiblePages = owner
    ? allPages
    : allPages.filter((p) => p.visibility !== "private");
  const linkMap: Record<string, string> = {};
  for (const p of visiblePages) linkMap[p.title.toLowerCase()] = p.slug;

  // ---- Edit mode (owner only) ----
  if (owner && edit) {
    let decisionFields: DecisionFields | undefined;
    let supersedeOptions: { id: string; title: string }[] = [];
    if (kind === "decision") {
      decisionFields = {
        context: meta?.context ?? "",
        decision: meta?.decision ?? "",
        consequences: meta?.consequences ?? "",
        status: meta?.status ?? "proposed",
        supersedesId: meta?.supersedesId ?? null,
      };
      const decisions = await listPosts("decision");
      supersedeOptions = decisions
        .filter((d) => d.id !== post.id)
        .map((d) => ({ id: d.id, title: d.title }));
    }

    return (
      <PostEditor
        id={post.id}
        kind={kind}
        slug={post.slug}
        initialTitle={post.title}
        initialContent={post.content as JSONContent | null}
        initialStatus={post.status}
        initialVisibility={post.visibility}
        initialTags={tags.map((t) => t.name)}
        initialDecision={decisionFields}
        supersedeOptions={supersedeOptions}
        linkMap={linkMap}
      />
    );
  }

  // ---- Reader ----
  const backlinks = await getBacklinks("post", post.id, { includePrivate: owner });

  let supersedesPost: { slug: string; title: string } | null = null;
  if (meta?.supersedesId) {
    const prior = await listPosts("decision");
    const found = prior.find((p) => p.id === meta.supersedesId);
    if (found) supersedesPost = { slug: found.slug, title: found.title };
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          {kind === "decision" ? (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <ScrollText className="size-3" />
              Decision record
            </span>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span
              className={
                post.status === "published"
                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                  : "font-medium"
              }
            >
              {post.status === "published" ? "Published" : "Draft"}
            </span>
            {post.publishedAt ? (
              <span>· {new Date(post.publishedAt).toLocaleDateString()}</span>
            ) : null}
            <span>· {post.visibility}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ExportButton postId={post.id} />
          {owner ? (
            <Button variant="outline" render={<Link href={`${basePath}/${post.slug}?edit=1`} />}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {tags.map((t) => (
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

      {kind === "decision" && meta ? (
        <div className="mb-6 space-y-4 rounded-lg border bg-card p-5 text-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {statusLabel[meta.status] ?? meta.status}
            </span>
            {supersedesPost ? (
              <span className="text-xs text-muted-foreground">
                supersedes{" "}
                <Link
                  href={`/decisions/${supersedesPost.slug}`}
                  className="underline"
                >
                  {supersedesPost.title}
                </Link>
              </span>
            ) : null}
          </div>
          {meta.context ? (
            <div>
              <p className="font-medium">Context</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{meta.context}</p>
            </div>
          ) : null}
          {meta.decision ? (
            <div>
              <p className="font-medium">Decision</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{meta.decision}</p>
            </div>
          ) : null}
          {meta.consequences ? (
            <div>
              <p className="font-medium">Consequences</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {meta.consequences}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <ContentView content={post.content as JSONContent | null} linkMap={linkMap} />

      <BacklinksPanel backlinks={backlinks} />
    </article>
  );
}
