import Link from "next/link";
import { Tag as TagIcon } from "lucide-react";

import { listTagsWithCounts } from "@/lib/tags";

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  const tags = (await listTagsWithCounts()).filter((t) => t.count > 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TagIcon className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link
              key={t.id}
              href={`/tags/${t.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm hover:bg-muted"
            >
              #{t.name}
              <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                {t.count}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
