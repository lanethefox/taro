import { ScrollText } from "lucide-react";

import { ModulePlaceholder } from "@/components/shell/module-placeholder";

export default function DecisionsPage() {
  return (
    <ModulePlaceholder
      icon={ScrollText}
      title="Decision log"
      description="Architecture decision records with a real, navigable history."
      milestone="M1 — Knowledge core"
      capabilities={[
        "Structured ADR fields: context, decision, consequences, status.",
        "Status flow: proposed → accepted → superseded.",
        "Supersedes links chain decisions into a history.",
        "Link the models and concepts a decision affected.",
      ]}
    />
  );
}
