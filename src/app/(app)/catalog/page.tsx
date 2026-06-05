import { listModels, listSources } from "@/db/queries/catalog";
import { getSessionContext, isOwner } from "@/lib/auth";
import { CatalogList } from "@/components/catalog/catalog-list";

export const metadata = { title: "Catalog" };

export default async function CatalogPage() {
  const [models, sources, ctx] = await Promise.all([
    listModels(),
    listSources(),
    getSessionContext(),
  ]);
  const owner = isOwner(ctx);
  const visibleModels = owner
    ? models
    : models.filter((m) => m.visibility !== "private");
  const visibleSources = owner
    ? sources
    : sources.filter((s) => s.visibility !== "private");

  return (
    <CatalogList models={visibleModels} sources={visibleSources} owner={owner} />
  );
}
