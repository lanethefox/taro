import Link from "next/link";
import { notFound } from "next/navigation";

import { getSessionContext, isOwner } from "@/lib/auth";
import { getNodesForTag, getTagBySlug } from "@/lib/tags";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  return { title: tag ? `#${tag.name}` : "Tag" };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  const nodes = (await getNodesForTag(tag.id)).filter(
    (n) => owner || n.visibility !== "private",
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm text-muted-foreground">Tag</p>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">#{tag.name}</h1>

      {nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing tagged here yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {nodes.map((n) => (
            <li key={`${n.nodeType}:${n.id}`}>
              <Link
                href={n.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
              >
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                  {n.nodeType}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{n.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
