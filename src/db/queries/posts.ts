import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { decisionMeta, posts, type DecisionMeta, type Post } from "@/db/schema";
import { emptyDoc, type JSONContent } from "@/lib/content";
import { slugify } from "@/lib/slug";

export type PostKind = "blog" | "decision";
export type PostStatus = "draft" | "published";
export type Visibility = "private" | "viewer" | "public";

export type PostListItem = Pick<
  Post,
  "id" | "title" | "slug" | "kind" | "status" | "visibility" | "publishedAt" | "updatedAt"
>;

export async function listPosts(kind?: PostKind): Promise<PostListItem[]> {
  const cols = {
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    kind: posts.kind,
    status: posts.status,
    visibility: posts.visibility,
    publishedAt: posts.publishedAt,
    updatedAt: posts.updatedAt,
  };
  const base = db.select(cols).from(posts);
  return kind
    ? base.where(eq(posts.kind, kind)).orderBy(desc(posts.updatedAt))
    : base.orderBy(desc(posts.updatedAt));
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const [row] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  return row;
}

export async function getPostById(id: string): Promise<Post | undefined> {
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row;
}

export async function getDecisionMeta(
  postId: string,
): Promise<DecisionMeta | undefined> {
  const [row] = await db
    .select()
    .from(decisionMeta)
    .where(eq(decisionMeta.postId, postId))
    .limit(1);
  return row;
}

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let n = 1;
  for (;;) {
    const where = excludeId
      ? and(eq(posts.slug, candidate), ne(posts.id, excludeId))
      : eq(posts.slug, candidate);
    const [clash] = await db.select({ id: posts.id }).from(posts).where(where).limit(1);
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function createPost(input: {
  title: string;
  kind: PostKind;
  content?: JSONContent | null;
}): Promise<Post> {
  const slug = await uniqueSlug(input.title);
  const [row] = await db
    .insert(posts)
    .values({
      title: input.title.trim() || "Untitled",
      slug,
      kind: input.kind,
      content: input.content ?? emptyDoc(),
    })
    .returning();

  if (input.kind === "decision") {
    await db.insert(decisionMeta).values({ postId: row.id }).onConflictDoNothing();
  }
  return row;
}

export async function updatePost(
  id: string,
  input: {
    title?: string;
    content?: JSONContent | null;
    status?: PostStatus;
    visibility?: Visibility;
  },
): Promise<Post | undefined> {
  const patch: Partial<typeof posts.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) patch.title = input.title.trim() || "Untitled";
  if (input.content !== undefined) patch.content = input.content;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.status !== undefined) {
    patch.status = input.status;
    // Stamp publish time the first time it goes live.
    if (input.status === "published") {
      const existing = await getPostById(id);
      if (existing && !existing.publishedAt) patch.publishedAt = new Date();
    }
  }

  const [row] = await db.update(posts).set(patch).where(eq(posts.id, id)).returning();
  return row;
}

export async function upsertDecisionMeta(
  postId: string,
  input: {
    context?: string | null;
    decision?: string | null;
    consequences?: string | null;
    status?: "proposed" | "accepted" | "superseded";
    supersedesId?: string | null;
  },
): Promise<void> {
  const existing = await getDecisionMeta(postId);
  if (existing) {
    await db
      .update(decisionMeta)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(decisionMeta.postId, postId));
  } else {
    await db.insert(decisionMeta).values({ postId, ...input });
  }

  // If this decision supersedes another, mark the prior one superseded.
  if (input.supersedesId) {
    await db
      .update(decisionMeta)
      .set({ status: "superseded", updatedAt: new Date() })
      .where(eq(decisionMeta.postId, input.supersedesId));
  }
}

export async function deletePost(id: string): Promise<void> {
  // decision_meta cascades via FK.
  await db.delete(posts).where(eq(posts.id, id));
}
