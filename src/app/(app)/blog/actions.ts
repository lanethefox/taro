"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createPost,
  deletePost,
  getPostById,
  updatePost,
  upsertDecisionMeta,
} from "@/db/queries/posts";
import { requireOwner } from "@/lib/auth";
import type { JSONContent } from "@/lib/content";
import { removeAllLinksFor, syncLinks } from "@/lib/links";
import { syncTags } from "@/lib/tags";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  kind: z.enum(["blog", "decision"]),
});

function listPathFor(kind: "blog" | "decision") {
  return kind === "decision" ? "/decisions" : "/blog";
}

export async function createPostAction(formData: FormData) {
  await requireOwner();

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    const kind = (formData.get("kind") as string) === "decision" ? "decision" : "blog";
    redirect(
      `${listPathFor(kind)}/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const post = await createPost(parsed.data);
  revalidatePath(listPathFor(parsed.data.kind));
  redirect(`${listPathFor(parsed.data.kind)}/${post.slug}?edit=1`);
}

const decisionSchema = z.object({
  context: z.string().optional(),
  decision: z.string().optional(),
  consequences: z.string().optional(),
  status: z.enum(["proposed", "accepted", "superseded"]).optional(),
  supersedesId: z.string().uuid().nullable().optional(),
});

const saveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  content: z.unknown(),
  status: z.enum(["draft", "published"]),
  visibility: z.enum(["private", "viewer", "public"]),
  tags: z.array(z.string()).default([]),
  decision: decisionSchema.optional(),
});

export type SavePostResult =
  | { ok: true; slug: string; kind: "blog" | "decision" }
  | { ok: false; error: string };

export async function savePostAction(input: {
  id: string;
  title: string;
  content: JSONContent;
  status: "draft" | "published";
  visibility: "private" | "viewer" | "public";
  tags: string[];
  decision?: z.infer<typeof decisionSchema>;
}): Promise<SavePostResult> {
  await requireOwner();

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const post = await updatePost(parsed.data.id, {
    title: parsed.data.title,
    content: parsed.data.content as JSONContent,
    status: parsed.data.status,
    visibility: parsed.data.visibility,
  });
  if (!post) return { ok: false, error: "Post not found" };

  await syncLinks("post", post.id, parsed.data.content as JSONContent);
  await syncTags("post", post.id, parsed.data.tags);

  if (post.kind === "decision" && parsed.data.decision) {
    await upsertDecisionMeta(post.id, {
      ...parsed.data.decision,
      supersedesId: parsed.data.decision.supersedesId ?? null,
    });
  }

  const listPath = listPathFor(post.kind);
  revalidatePath(listPath);
  revalidatePath(`${listPath}/${post.slug}`);
  return { ok: true, slug: post.slug, kind: post.kind };
}

export async function deletePostAction(id: string): Promise<void> {
  await requireOwner();
  const post = await getPostById(id);
  if (!post) return;
  await removeAllLinksFor("post", id);
  await syncTags("post", id, []); // clear tag attachments
  await deletePost(id);
  revalidatePath(listPathFor(post.kind));
  redirect(listPathFor(post.kind));
}
