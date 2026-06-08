import Link from "next/link";
import { AlertTriangle, Boxes, Code2, Shapes } from "lucide-react";

import type { SemanticLayer, SemanticMetric } from "@/db/queries/metrics";

function defines(m: SemanticMetric): string {
  if (m.type === "ratio") return `${m.numeratorName ?? "?"} / ${m.denominatorName ?? "?"}`;
  if (m.type === "cumulative") return m.window ? `cumulative · ${m.window}` : "cumulative";
  return m.expression ?? "—";
}

function MetricRow({ m }: { m: SemanticMetric }) {
  return (
    <div className="tile p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{m.name}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {m.type}
            </span>
          </div>
          <code className="mt-1 block truncate text-xs text-muted-foreground">{defines(m)}</code>
        </div>
        {m.modelName ? (
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Boxes className="size-3" />
            {m.modelName}
          </span>
        ) : null}
      </div>
      {m.recomputedBy.length > 0 ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-terracotta">
          <AlertTriangle className="size-3 shrink-0" />
          Recomputed in {m.recomputedBy.join(", ")} — should reference {m.modelName ?? "the owner"}.
        </div>
      ) : null}
    </div>
  );
}

export function SemanticLayerView({
  layer,
  coverage,
}: {
  layer: SemanticLayer;
  coverage: { wired: number; total: number; pct: number };
}) {
  const byDomain = new Map<string, SemanticMetric[]>();
  for (const m of layer.metrics) {
    const k = m.domainName ?? "Unassigned";
    (byDomain.get(k) ?? byDomain.set(k, []).get(k)!).push(m);
  }
  const groups = [...byDomain.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Shapes className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Semantic layer</h1>
          <p className="text-sm text-muted-foreground">
            Metrics defined once, owned by a model. The structured definition layer
            — not the wiki, which holds the prose.
          </p>
        </div>
      </div>

      <section className="mb-8 grid grid-cols-3 gap-3">
        <div className="tile p-4">
          <div className="text-2xl font-semibold tabular-nums">{layer.metrics.length}</div>
          <div className="text-xs text-muted-foreground">metrics defined</div>
        </div>
        <div className="tile p-4">
          <div
            className={`text-2xl font-semibold tabular-nums ${layer.driftCount > 0 ? "text-terracotta" : "text-sage"}`}
          >
            {layer.driftCount}
          </div>
          <div className="text-xs text-muted-foreground">recomputed elsewhere</div>
        </div>
        <div className="tile p-4">
          <div className="text-2xl font-semibold tabular-nums">{coverage.pct}%</div>
          <div className="text-xs text-muted-foreground">
            catalog wired ({coverage.wired}/{coverage.total})
          </div>
        </div>
      </section>

      {groups.map(([domain, ms]) => (
        <section key={domain} className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">{domain}</h2>
          <div className="space-y-2">
            {ms.map((m) => (
              <MetricRow key={m.id} m={m} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-2">
        <Link
          href="/api/context"
          className="tile flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Code2 className="size-4" />
          </span>
          <div>
            <div className="text-sm font-medium">Agent context bundle</div>
            <div className="text-xs text-muted-foreground">
              The semantic layer (metrics + definitions) plus per-node arm,
              conformance, and cost — served as JSON to AI agents.
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
