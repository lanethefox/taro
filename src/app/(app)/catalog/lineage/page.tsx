import { GitBranch } from "lucide-react";

import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export default function LineagePage() {
  return (
    <ModulePlaceholder
      icon={GitBranch}
      title="Lineage"
      description="Model→model dependencies as a directed graph."
      milestone="M2 — Catalog"
      capabilities={[
        "React Flow graph derived from declared model dependencies.",
        "Upstream / downstream navigation.",
        "Shared node/edge components with the ERD canvas.",
      ]}
    />
  );
}
