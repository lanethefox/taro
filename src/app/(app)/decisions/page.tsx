import { listPosts } from "@/db/queries/posts";
import { getSessionContext, isOwner } from "@/lib/auth";
import { PostList } from "@/components/posts/post-list";

export const metadata = { title: "Decisions" };

export default async function DecisionsPage() {
  const [posts, ctx] = await Promise.all([
    listPosts("decision"),
    getSessionContext(),
  ]);
  const owner = isOwner(ctx);
  const visible = owner ? posts : posts.filter((p) => p.visibility !== "private");
  return <PostList posts={visible} kind="decision" owner={owner} />;
}
