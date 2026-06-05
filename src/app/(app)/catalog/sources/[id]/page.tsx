import { getSourceById } from "@/db/queries/catalog";
import { SourceDetail } from "@/components/catalog/source-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getSourceById(id);
  return { title: source?.name ?? "Source" };
}

export default async function SourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
  return <SourceDetail id={id} edit={edit === "1"} />;
}
