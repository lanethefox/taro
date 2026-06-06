import Link from "next/link";
import { Hash, Library, TriangleAlert } from "lucide-react";

import { getGlossary } from "@/db/queries/glossary";
import { getSessionContext, isOwner } from "@/lib/auth";
import { findNearDuplicates } from "@/lib/coherence";

export const metadata = { title: "Glossary" };

export default async function GlossaryPage() {
  const [entries, ctx] = await Promise.all([getGlossary(), getSessionContext()]);
  const owner = isOwner(ctx);
  const visible = owner
    ? entries
    : entries.filter((e) => e.visibility !== "private");

  // Coherence nudge (owner-only, non-blocking): flag near-duplicate concepts.
  const dups = owner
    ? findNearDuplicates(
        visible.map((e) => ({ id: e.id, title: e.title, slug: e.slug })),
      )
    : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Library className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Glossary</h1>
          <p className="text-sm text-muted-foreground">
            Canonical definitions — defined once, used everywhere.
          </p>
        </div>
      </div>

      {dups.length > 0 ? (
        <div className="mb-6 rounded-lg border border-wheat/50 bg-wheat/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <TriangleAlert className="size-4 text-wheat" />
            Possible duplicate concepts — consider merging
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {dups.map((g, i) => (
              <li key={i}>
                {g.members.map((m, j) => (
                  <span key={m.id}>
                    {j > 0 ? " · " : ""}
                    <Link href={`/wiki/${m.slug}`} className="hover:text-foreground hover:underline">
                      {m.title}
                    </Link>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No concepts yet. Concept pages (the semantic layer) show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visible.map((e) => (
            <li key={e.id}>
              <Link
                href={`/wiki/${e.slug}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50"
              >
                <Hash className="mt-0.5 size-4 shrink-0 text-primary/70" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.title}</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      used by {e.usedBy}
                    </span>
                  </div>
                  {e.definition ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {e.definition}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
