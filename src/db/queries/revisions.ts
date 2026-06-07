import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { revisions } from "@/db/schema";
import type { JSONContent } from "@/lib/content";

export type RevisionRow = {
  id: string;
  title: string | null;
  content: JSONContent | null;
  editorId: string | null;
  createdAt: Date;
};

/** Append a snapshot of a page/post's saved state to its history. */
export async function recordRevision(input: {
  nodeType: "page" | "post";
  nodeId: string;
  title: string;
  content: JSONContent | null;
  editorId?: string | null;
}): Promise<void> {
  await db.insert(revisions).values({
    nodeType: input.nodeType,
    nodeId: input.nodeId,
    title: input.title,
    content: input.content ?? null,
    editorId: input.editorId ?? null,
  });
}

/** Revision history for a node, newest first. */
export async function listRevisions(
  nodeType: "page" | "post",
  nodeId: string,
): Promise<RevisionRow[]> {
  const rows = await db
    .select({
      id: revisions.id,
      title: revisions.title,
      content: revisions.content,
      editorId: revisions.editorId,
      createdAt: revisions.createdAt,
    })
    .from(revisions)
    .where(and(eq(revisions.nodeType, nodeType), eq(revisions.nodeId, nodeId)))
    .orderBy(desc(revisions.createdAt))
    .limit(100);
  return rows.map((r) => ({
    ...r,
    content: r.content as JSONContent | null,
  }));
}
