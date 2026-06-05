import { getPostBySlug } from "@/db/queries/posts";
import { PostPage } from "@/components/posts/post-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return { title: post?.title ?? "Post" };
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ slug }, { edit }] = await Promise.all([params, searchParams]);
  return <PostPage slug={slug} kind="blog" edit={edit === "1"} />;
}
