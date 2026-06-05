import { Network } from "lucide-react";

import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export default function ErdPage() {
  return (
    <ModulePlaceholder
      icon={Network}
      title="ERD designer"
      description="A saved React Flow view over catalog models — single source of truth."
      milestone="M3 — ERD designer"
      capabilities={[
        "Table nodes render columns, types, and keys from catalog models.",
        "Relationship edges with cardinality (1:1 / 1:N / N:N) and join columns.",
        "Per-diagram layout persistence; edits write through to the catalog.",
        "Export to PNG/SVG, DBML, SQL DDL, and dbt schema.yml.",
      ]}
    />
  );
}
