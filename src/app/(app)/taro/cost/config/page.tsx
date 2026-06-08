import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";

import { getCostConfigEditor } from "@/db/queries/cost";
import { requireOwner } from "@/lib/auth";
import { CostConfigEditor } from "@/components/taro/cost-config-editor";

export const metadata = { title: "Cost configuration — Taro" };

export default async function CostConfigPage() {
  await requireOwner();
  const data = await getCostConfigEditor();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/taro/cost"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Cost
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Settings2 className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cost functions</h1>
          <p className="text-sm text-muted-foreground">
            How each source bills (MAR, MTU, tokens, …) and the global compute rate
            for models. Editable by the AE team.
          </p>
        </div>
      </div>
      <CostConfigEditor global={data.global} sources={data.sources} />
    </div>
  );
}
