import { Search } from "lucide-react";

import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export default function SearchPage() {
  return (
    <ModulePlaceholder
      icon={Search}
      title="Search"
      description="Global search over pages, posts, models, and columns."
      milestone="M1 — Knowledge core"
      capabilities={[
        "Postgres full-text search, ranked.",
        "Trigram fuzzy fallback (pg_trgm).",
        "Command-palette navigation across the whole graph (M4).",
      ]}
    />
  );
}
