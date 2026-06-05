import { requireOwner } from "@/lib/auth";
import { NewPostForm } from "@/components/posts/new-post-form";

export const metadata = { title: "New post" };

export default async function NewBlogPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOwner();
  const { error } = await searchParams;
  return <NewPostForm kind="blog" error={error} />;
}
