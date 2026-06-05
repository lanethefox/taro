import { requireOwner } from "@/lib/auth";
import { NewCatalogForm } from "@/components/catalog/new-catalog-form";

export const metadata = { title: "New source" };

export default async function NewSourcePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOwner();
  const { error } = await searchParams;
  return <NewCatalogForm kind="source" error={error} />;
}
