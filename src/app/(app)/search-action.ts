"use server";

import { getSessionContext, isOwner } from "@/lib/auth";
import { search, type SearchResult } from "@/lib/search";

/** Server action backing the command palette (and any client search box). */
export async function globalSearchAction(query: string): Promise<SearchResult[]> {
  const ctx = await getSessionContext();
  return search(query, { owner: isOwner(ctx) });
}
