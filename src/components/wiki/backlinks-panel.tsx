import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";

import type { Backlink } from "@/lib/links";

/** "Referenced by" — every node view renders its backlinks (SPEC §7). */
export function BacklinksPanel({ backlinks }: { backlinks: Backlink[] }) {
  return (
    <aside className="mt-12 border-t pt-5">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <ArrowUpLeft className="size-4" />
        Referenced by
        <span className="rounded-full bg-muted px-1.5 text-xs">
          {backlinks.length}
        </span>
      </h2>
      {backlinks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No other pages link here yet.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {backlinks.map((b) => (
            <li key={`${b.sourceType}:${b.sourceId}`}>
              <Link
                href={b.href}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm hover:bg-muted"
              >
                {b.sourceType === "post" ? (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    post
                  </span>
                ) : null}
                {b.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
