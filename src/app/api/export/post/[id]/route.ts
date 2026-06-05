import { NextResponse } from "next/server";

import { getPostById } from "@/db/queries/posts";
import { getSessionContext, isOwner } from "@/lib/auth";
import type { JSONContent } from "@/lib/content";
import { docToMarkdown } from "@/lib/export/markdown";

/**
 * Export a post as clean Markdown for LinkedIn (SPEC §4.2).
 * `?format=text` returns plain text (marks stripped). Auth-gated: owner always;
 * others only for non-private posts.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await getPostById(id);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isOwner(ctx) && post.visibility === "private") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const markdown = docToMarkdown(post.content as JSONContent | null);
  const titled = `# ${post.title}\n\n${markdown}`;

  const format = new URL(request.url).searchParams.get("format");
  const body =
    format === "text"
      ? titled.replace(/[*_~`#>]/g, "").replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
      : titled;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `inline; filename="${post.slug}.md"`,
    },
  });
}
