import { listPosts } from "@/db/queries/posts";
import { getSessionContext, isOwner } from "@/lib/auth";
import { PostList } from "@/components/posts/post-list";

export const metadata = { title: "Blog" };

export default async function BlogPage() {
  const [posts, ctx] = await Promise.all([listPosts("blog"), getSessionContext()]);
  const owner = isOwner(ctx);
  const visible = owner ? posts : posts.filter((p) => p.visibility !== "private");
  return <PostList posts={visible} kind="blog" owner={owner} />;
}
