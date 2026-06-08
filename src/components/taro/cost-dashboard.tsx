import Link from "next/link";
import { Coins, Settings2 } from "lucide-react";

import type { CostReport } from "@/db/queries/cost";
import type { CostableNode } from "@/db/queries/cost";
import { Button } from "@/components/ui/button";
import { BackfillCalculator } from "@/components/taro/backfill-calculator";

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const layerLabel: Record<string, string> = {
  sources: "Sources (ingestion)",
  staging: "Staging",
  intermediate: "Intermediate",
  marts: "Marts",
  other: "Other",
};

export function CostDashboard({
  report,
  nodes,
  owner,
}: {
  report: CostReport;
  nodes: CostableNode[];
  owner: boolean;
}) {
  const pctOfBudget =
    report.totalBudget > 0 ? Math.round((report.total / report.totalBudget) * 100) : null;
  const maxLayer = Math.max(1, ...report.byLayer.map((l) => l.cost));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Coins className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cost</h1>
            <p className="text-sm text-muted-foreground">
              Ingestion, transformation, and serving — attributed to each arm as a
              cost center{report.period ? ` · ${report.period}` : ""}.
            </p>
          </div>
        </div>
        {owner ? (
          <Button variant="outline" render={<Link href="/taro/cost/config" />}>
            <Settings2 className="size-4" />
            Configure
          </Button>
        ) : null}
      </div>

      <section className="mb-10 grid grid-cols-3 gap-3">
        <div className="tile p-4">
          <div className="text-2xl font-semibold tabular-nums">{money(report.total)}</div>
          <div className="text-xs text-muted-foreground">monthly spend</div>
        </div>
        <div className="tile p-4">
          <div className="text-2xl font-semibold tabular-nums">{money(report.totalBudget)}</div>
          <div className="text-xs text-muted-foreground">total budget</div>
        </div>
        <div className="tile p-4">
          <div
            className={`text-2xl font-semibold tabular-nums ${pctOfBudget !== null && pctOfBudget > 100 ? "text-terracotta" : "text-sage"}`}
          >
            {pctOfBudget === null ? "—" : `${pctOfBudget}%`}
          </div>
          <div className="text-xs text-muted-foreground">of budget</div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Budget vs actual by arm
        </h2>
        <div className="space-y-3">
          {report.arms.map((a) => {
            const over = a.budget !== null && a.actual > a.budget;
            const pct = a.budget && a.budget > 0 ? Math.min(100, (a.actual / a.budget) * 100) : a.actual > 0 ? 100 : 0;
            return (
              <div key={a.domainId} className="tile p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{a.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    <span className={over ? "text-terracotta" : "text-foreground"}>
                      {money(a.actual)}
                    </span>
                    {a.budget !== null ? ` / ${money(a.budget)}` : ""}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${over ? "bg-terracotta" : "bg-sage"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">By layer</h2>
          <div className="space-y-2">
            {report.byLayer.map((l) => (
              <div key={l.layer} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span>{layerLabel[l.layer] ?? l.layer}</span>
                  <span className="tabular-nums text-muted-foreground">{money(l.cost)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-wheat" style={{ width: `${(l.cost / maxLayer) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Top spenders</h2>
          <div className="space-y-1.5">
            {report.topSpenders.map((n) => (
              <div key={`${n.type}:${n.id}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  {n.name}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {n.type === "source" ? n.unit ?? "source" : n.layer ?? "model"}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{money(n.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Backfill predictor
        </h2>
        <BackfillCalculator nodes={nodes} />
      </section>
    </div>
  );
}
