import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, X } from "lucide-react";

import type { DomainPanel as DomainPanelData } from "@/db/queries/domain-panel";
import { CONFORMANCE_TARGET } from "@/db/queries/domain-panel";
import { DocRender } from "@/components/taro/doc-render";
import { Sparkline } from "@/components/taro/sparkline";

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
function scoreColor(score: number): string {
  if (score >= 80) return "text-sage";
  if (score >= 50) return "text-wheat";
  return "text-terracotta";
}

function catalogHref(n: { type: "model" | "source"; id: string }): string {
  return n.type === "model" ? `/catalog/models/${n.id}` : `/catalog/sources/${n.id}`;
}

function DodPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
        ok ? "bg-sage/15 text-sage" : "bg-terracotta/15 text-terracotta"
      }`}
    >
      {ok ? <Check className="size-3" /> : <X className="size-3" />}
      {label}
    </span>
  );
}

export function DomainPanel({ panel }: { panel: DomainPanelData }) {
  const overBudget = panel.cost.budget !== null && panel.cost.actual > panel.cost.budget;
  const budgetPct =
    panel.cost.budget && panel.cost.budget > 0
      ? Math.min(100, (panel.cost.actual / panel.cost.budget) * 100)
      : panel.cost.actual > 0
        ? 100
        : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/taro"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Control center
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{panel.name}</h1>
            {panel.conceptSlug ? (
              <Link
                href={`/wiki/${panel.conceptSlug}`}
                className="text-muted-foreground hover:text-primary"
                title="Open wiki section"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            ) : null}
          </div>
          {panel.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{panel.description}</p>
          ) : null}
        </div>
        {panel.score !== null ? (
          <div className="text-right">
            <div className={`text-3xl font-semibold tabular-nums ${scoreColor(panel.score)}`}>
              {panel.score}
            </div>
            <div className="text-xs text-muted-foreground">conformance</div>
            {panel.trend.length >= 2 ? (
              <div className="mt-1 flex justify-end">
                <Sparkline values={panel.trend} className={scoreColor(panel.score)} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <DodPill ok={panel.definitionOfDone.conformance} label={`Conformance ≥ ${CONFORMANCE_TARGET}`} />
        <DodPill ok={panel.definitionOfDone.budget} label="Within budget" />
      </div>

      {panel.content ? (
        <section className="tile mb-8 p-5">
          <DocRender doc={panel.content} />
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Cost center</h2>
        <div className="tile p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Monthly spend</span>
            <span className="tabular-nums text-muted-foreground">
              <span className={overBudget ? "text-terracotta" : "text-foreground"}>
                {money(panel.cost.actual)}
              </span>
              {panel.cost.budget !== null ? ` / ${money(panel.cost.budget)}` : ""}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${overBudget ? "bg-terracotta" : "bg-sage"}`} style={{ width: `${budgetPct}%` }} />
          </div>
          {panel.cost.byNode.length > 0 ? (
            <ul className="mt-4 space-y-1.5">
              {panel.cost.byNode.slice(0, 6).map((n) => (
                <li key={`${n.type}:${n.id}`} className="flex justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {n.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">{n.unit ?? n.layer ?? n.type}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{money(n.cost)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Top gaps</h2>
            <Link href="/taro/audit" className="text-xs text-primary hover:underline">
              Audit →
            </Link>
          </div>
          {panel.failingChecks.length === 0 ? (
            <div className="tile p-4 text-sm text-muted-foreground">No gaps.</div>
          ) : (
            <div className="space-y-1.5">
              {panel.failingChecks.slice(0, 6).map((f) => (
                <div key={f.check.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{f.check.title}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {f.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Open remediations</h2>
            <Link href="/taro/remediation" className="text-xs text-primary hover:underline">
              Backlog →
            </Link>
          </div>
          {panel.remediations.length === 0 ? (
            <div className="tile p-4 text-sm text-muted-foreground">Nothing open.</div>
          ) : (
            <div className="space-y-1.5">
              {panel.remediations.slice(0, 6).map((r) => (
                <div key={r.id} className="truncate text-sm">
                  {r.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Models &amp; sources <span className="tabular-nums">({panel.nodes.length})</span>
        </h2>
        <div className="space-y-1.5">
          {panel.nodes.map((n) => (
            <Link
              key={`${n.type}:${n.id}`}
              href={catalogHref(n)}
              className="tile flex items-center gap-3 p-3 transition-colors hover:border-primary/40"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {n.name}
                <span className="ml-1.5 text-xs text-muted-foreground">{n.type}</span>
              </span>
              {n.fails + n.warns > 0 ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {n.fails + n.warns} to address
                </span>
              ) : null}
              <span className={`w-9 text-right text-sm font-semibold tabular-nums ${scoreColor(n.score)}`}>
                {n.score}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
