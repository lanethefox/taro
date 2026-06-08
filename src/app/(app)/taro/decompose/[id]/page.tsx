import { notFound } from "next/navigation";

import { getModelInspection } from "@/db/queries/inspect";
import { requireSession } from "@/lib/auth";
import { ModelInspector } from "@/components/taro/model-inspector";

export const metadata = { title: "Decomposition advisor — Taro" };

export default async function DecomposePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const inspection = await getModelInspection(id);
  if (!inspection) notFound();
  return <ModelInspector inspection={inspection} />;
}
