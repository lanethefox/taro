import { requireOwner } from "@/lib/auth";
import { NewCatalogForm } from "@/components/catalog/new-catalog-form";

export const metadata = { title: "New model" };

export default async function NewModelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOwner();
  const { error } = await searchParams;
  return <NewCatalogForm kind="model" error={error} />;
}
