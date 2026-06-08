"use client";

import { useState, useTransition } from "react";
import { Calculator, Loader2 } from "lucide-react";

import {
  estimateBackfillAction,
  type BackfillResult,
} from "@/app/(app)/taro/cost/actions";
import type { CostableNode } from "@/db/queries/cost";
import { Button } from "@/components/ui/button";

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function BackfillCalculator({ nodes }: { nodes: CostableNode[] }) {
  const [sel, setSel] = useState<string>(nodes[0] ? `${nodes[0].type}:${nodes[0].id}` : "");
  const [periods, setPeriods] = useState(12);
  const [descendants, setDescendants] = useState(true);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [pending, startTransition] = useTransition();

  function estimate() {
    const [nodeType, nodeId] = sel.split(":") as ["model" | "source", string];
    if (!nodeId) return;
    startTransition(async () => {
      setResult(await estimateBackfillAction({ nodeType, nodeId, periods, includeDescendants: descendants }));
    });
  }

  return (
    <div className="tile p-5">
      <p className="mb-4 text-sm text-muted-foreground">
        Predict the cost of reprocessing a node over a window — at source, model,
        or column level — before you run it.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Node
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="min-w-56 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          >
            {nodes.map((n) => (
              <option key={`${n.type}:${n.id}`} value={`${n.type}:${n.id}`}>
                {n.name} ({n.type})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Periods (months)
          <input
            type="number"
            min={1}
            max={120}
            value={periods}
            onChange={(e) => setPeriods(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
            className="w-28 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={descendants}
            onChange={(e) => setDescendants(e.target.checked)}
          />
          Include downstream
        </label>
        <Button className="mb-0.5" disabled={pending || !sel} onClick={estimate}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
          Estimate
        </Button>
      </div>

      {result ? (
        result.ok ? (
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Metric label="This node" value={money(result.nodeCost)} accent />
            <Metric label="Per column" value={money(result.columnShare)} />
            <Metric
              label={`+ ${result.descendantCount} downstream`}
              value={money(result.cascadeTotal)}
            />
            <Metric
              label={result.unit ? `Units (${result.unit})` : "Units"}
              value={result.units.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            />
          </div>
        ) : (
          <div className="mt-4 text-sm text-terracotta">{result.error}</div>
        )
      ) : null}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-lg font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
