import { requireOwner } from "@/lib/auth";
import { NewPostForm } from "@/components/posts/new-post-form";

export const metadata = { title: "New decision" };

export default async function NewDecisionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOwner();
  const { error } = await searchParams;
  return <NewPostForm kind="decision" error={error} />;
}
