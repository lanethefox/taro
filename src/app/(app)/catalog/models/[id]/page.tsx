import { getModelById } from "@/db/queries/catalog";
import { ModelDetail } from "@/components/catalog/model-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const model = await getModelById(id);
  return { title: model?.name ?? "Model" };
}

export default async function ModelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
  return <ModelDetail id={id} edit={edit === "1"} />;
}
