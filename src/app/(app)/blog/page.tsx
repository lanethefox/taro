import { PenLine } from "lucide-react";

import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export default function BlogPage() {
  return (
    <ModulePlaceholder
      icon={PenLine}
      title="Blog"
      description="Turn daily analytics-engineering work into shareable, IP-safe writing."
      milestone="M1 — Knowledge core"
      capabilities={[
        "Posts with draft/published status and per-post visibility.",
        "Same block editor as the wiki, with wikilinks into the graph.",
        "One-click LinkedIn export to clean markdown / plain text.",
        "Tags and tag pages.",
      ]}
    />
  );
}
