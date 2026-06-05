import { Boxes } from "lucide-react";

import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export default function CatalogPage() {
  return (
    <ModulePlaceholder
      icon={Boxes}
      title="Data catalog"
      description="Models, sources, and columns — with tests and observation metadata."
      milestone="M2 — Catalog"
      capabilities={[
        "Models: layer, materialization, grain, owner, SQL notes.",
        "Sources with freshness expectations and expected volume.",
        "Columns with data types, PK/FK flags, and inline tests.",
        "Observation metadata: freshness SLA, expected volume, monitoring notes.",
        "Concept ↔ catalog linking, both directions.",
      ]}
    />
  );
}
