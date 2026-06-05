import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";

import { getSessionContext, isOwner } from "@/lib/auth";
import { search } from "@/lib/search";
import { SearchBox } from "@/components/search/search-box";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  const results = query ? await search(query, { owner }) : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Search</h1>
      <SearchBox initialQuery={query} />

      {query ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Search across pages, concepts, posts, and decisions. Full-text ranked,
          with fuzzy matching on titles.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {results.map((r) => (
          <li key={`${r.type}:${r.id}`}>
            <Link
              href={r.href}
              className="block rounded-lg border bg-card p-4 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {r.badge}
                </span>
                <span className="font-medium">{r.title}</span>
              </div>
              {r.snippet ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {r.snippet}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      {query && results.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
          <SearchIcon className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nothing matched “{query}”.
          </p>
        </div>
      ) : null}
    </div>
  );
}
