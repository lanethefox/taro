import { BookOpen } from "lucide-react";

import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export default function WikiPage() {
  return (
    <ModulePlaceholder
      icon={BookOpen}
      title="Wiki / Reference"
      description="Hierarchical page tree plus a free-form graph of links across it."
      milestone="M1 — Knowledge core"
      capabilities={[
        "TipTap block editor: headings, lists, code & SQL blocks, tables, callouts, images.",
        "[[wikilinks]] resolve to nodes and write graph edges on save.",
        "Backlinks panel — every page shows what references it.",
        "Typed Concept pages seed the strategy library.",
        "Full-text + trigram fuzzy search across all content.",
      ]}
    />
  );
}
