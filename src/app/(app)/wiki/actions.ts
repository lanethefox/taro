"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createPage,
  deletePage,
  getPageById,
  updatePage,
} from "@/db/queries/pages";
import { requireOwner } from "@/lib/auth";
import type { JSONContent } from "@/lib/content";
import { removeAllLinksFor, syncLinks } from "@/lib/links";
import { syncTags } from "@/lib/tags";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  parentId: z.string().uuid().nullable().optional(),
  kind: z.enum(["wiki", "concept"]).optional(),
});

/** Create a page from the "New page" form, then open it in edit mode. */
export async function createPageAction(formData: FormData) {
  await requireOwner();

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    parentId: (formData.get("parentId") as string) || null,
    kind: (formData.get("kind") as string) || undefined,
  });
  if (!parsed.success) {
    redirect(`/wiki/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const page = await createPage(parsed.data);
  revalidatePath("/wiki");
  redirect(`/wiki/${page.slug}?edit=1`);
}

const saveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  content: z.unknown(),
  parentId: z.string().uuid().nullable().optional(),
  visibility: z.enum(["private", "viewer", "public"]).optional(),
  tags: z.array(z.string()).default([]),
});

export type SaveResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/** Persist title + content, then reconcile the wikilink graph and tags. */
export async function savePageAction(input: {
  id: string;
  title: string;
  content: JSONContent;
  parentId?: string | null;
  visibility?: "private" | "viewer" | "public";
  tags?: string[];
}): Promise<SaveResult> {
  await requireOwner();

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Guard against a page being its own parent.
  const parentId =
    parsed.data.parentId && parsed.data.parentId !== parsed.data.id
      ? parsed.data.parentId
      : null;

  const page = await updatePage(parsed.data.id, {
    title: parsed.data.title,
    content: parsed.data.content as JSONContent,
    parentId,
    visibility: parsed.data.visibility,
  });
  if (!page) return { ok: false, error: "Page not found" };

  await syncLinks("page", page.id, parsed.data.content as JSONContent);
  await syncTags("page", page.id, parsed.data.tags);

  revalidatePath("/wiki");
  revalidatePath(`/wiki/${page.slug}`);
  return { ok: true, slug: page.slug };
}

/** Delete a page (children re-parent) and purge its links. */
export async function deletePageAction(id: string): Promise<void> {
  await requireOwner();
  const page = await getPageById(id);
  if (!page) return;
  await removeAllLinksFor("page", id);
  await syncTags("page", id, []); // clear tag attachments
  await deletePage(id);
  revalidatePath("/wiki");
  redirect("/wiki");
}
