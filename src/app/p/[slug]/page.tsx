import { notFound } from "next/navigation";

import { getPostBySlug } from "@/db/queries/posts";
import type { JSONContent } from "@/lib/content";
import { ContentView } from "@/components/editor/content-view";

/**
 * Public, unauthenticated post view (allow-listed in the proxy). Renders only
 * posts explicitly set to `public`; everything else 404s. No app shell.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.visibility !== "public") return { title: "Not found" };
  return { title: post.title };
}

export default async function PublicPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.visibility !== "public") notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <article>
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
        {post.publishedAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(post.publishedAt).toLocaleDateString()}
          </p>
        ) : null}
        <div className="mt-6">
          {/* No linkMap: internal wikilinks render as plain text on the public page. */}
          <ContentView content={post.content as JSONContent | null} />
        </div>
      </article>
      <footer className="mt-12 border-t pt-4 text-xs text-muted-foreground">
        Shared from taro
      </footer>
    </main>
  );
}
