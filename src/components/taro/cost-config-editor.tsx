"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { saveCostConfigAction, type CostConfigInput } from "@/app/(app)/taro/cost/actions";
import type { CostConfigView } from "@/db/queries/cost";
import { Button } from "@/components/ui/button";

type RowProps = {
  title: string;
  subtitle?: string;
  scope: "global" | "source";
  nodeId?: string | null;
  config: CostConfigView | null;
};

function ConfigRow({ title, subtitle, scope, nodeId, config }: RowProps) {
  const [unit, setUnit] = useState(config?.unit ?? (scope === "global" ? "run-seconds" : ""));
  const [method, setMethod] = useState<"flat" | "per_unit">(
    config?.method === "flat" ? "flat" : "per_unit",
  );
  const [fixed, setFixed] = useState(config?.fixedCost ?? "0");
  const [rate, setRate] = useState(config?.perUnitRate ?? "0");
  const [pending, start] = useTransition();
  const tiered = config?.method === "tiered";

  function save() {
    const input: CostConfigInput = {
      scope,
      nodeId: scope === "global" ? null : nodeId,
      unit: unit.trim() || undefined,
      method,
      fixedCost: Number(fixed) || 0,
      perUnitRate: Number(rate) || 0,
      currency: config?.currency ?? "USD",
    };
    start(async () => {
      const res = await saveCostConfigAction(input);
      if (res.ok) toast.success(`Saved ${title}`);
      else toast.error(res.error);
    });
  }

  return (
    <div className="tile p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
        {tiered ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            currently tiered
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Unit">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="MAR, MTU, tokens…"
            className="w-28 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Method">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as "flat" | "per_unit")}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="per_unit">per unit</option>
            <option value="flat">flat</option>
          </select>
        </Field>
        <Field label="Fixed ($)">
          <input
            type="number"
            step="any"
            value={fixed}
            onChange={(e) => setFixed(e.target.value)}
            className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Per unit ($)">
          <input
            type="number"
            step="any"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={method === "flat"}
            className="w-28 rounded-md border border-input bg-background px-2 py-1.5 text-sm disabled:opacity-50"
          />
        </Field>
        <Button size="sm" className="mb-0.5" disabled={pending} onClick={save}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

export function CostConfigEditor({
  global,
  sources,
}: {
  global: CostConfigView | null;
  sources: { id: string; name: string; system: string | null; config: CostConfigView | null }[];
}) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Model compute</h2>
        <ConfigRow
          title="Global compute rate"
          subtitle="Applied to every model's run-seconds unless overridden."
          scope="global"
          config={global}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Source cost functions</h2>
        <div className="space-y-2">
          {sources.map((s) => (
            <ConfigRow
              key={s.id}
              title={s.name}
              subtitle={s.system ?? undefined}
              scope="source"
              nodeId={s.id}
              config={s.config}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tiered functions are seeded via SQL; editing here sets a flat or per-unit
          rate.
        </p>
      </section>
    </div>
  );
}
