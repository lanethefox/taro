import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  Database,
  Gauge,
  Layers,
  Upload,
} from "lucide-react";

import type { DomainWithCounts, PlatformOverview } from "@/db/queries/taro";
import { Button } from "@/components/ui/button";

function scoreColor(score: number): string {
  if (score >= 80) return "text-sage";
  if (score >= 50) return "text-wheat";
  return "text-terracotta";
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Boxes;
}) {
  return (
    <div className="tile flex items-center gap-3 p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-semibold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function fmtBudget(v: string | null): string | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo`;
}

export function ControlCenter({
  overview,
  domains,
  owner,
  platformScore,
  domainScores,
}: {
  overview: PlatformOverview;
  domains: DomainWithCounts[];
  owner: boolean;
  platformScore: number | null;
  domainScores: Record<string, number>;
}) {
  const lastImport = overview.lastImportAt
    ? new Date(overview.lastImportAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "never";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Gauge className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Control center
            </h1>
            <p className="text-sm text-muted-foreground">
              The data platform against the principles — each arm of the business
              as a cost center.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {platformScore !== null ? (
            <Link href="/taro/conformance" className="text-right">
              <div
                className={`text-3xl font-semibold tabular-nums ${scoreColor(platformScore)}`}
              >
                {platformScore}
              </div>
              <div className="text-xs text-muted-foreground">conformance</div>
            </Link>
          ) : null}
          {owner ? (
            <Button variant="outline" render={<Link href="/taro/import" />}>
              <Upload className="size-4" />
              Import dbt
            </Button>
          ) : null}
        </div>
      </div>

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Models" value={overview.models} icon={Boxes} />
        <Stat label="Sources" value={overview.sources} icon={Database} />
        <Stat label="Columns" value={overview.columns} icon={Layers} />
        <Stat label="Last import" value={lastImport} icon={Upload} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Arms of the business
          </h2>
          <div className="flex items-center gap-3">
            {overview.unassignedModels > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {overview.unassignedModels} models unassigned
              </span>
            ) : null}
            <Link
              href="/taro/conformance"
              className="text-xs text-primary hover:underline"
            >
              Scorecard →
            </Link>
          </div>
        </div>

        {domains.length === 0 ? (
          <div className="tile p-6 text-sm text-muted-foreground">
            No domains yet. Seed the arms of the business to start attributing the
            catalog and its cost.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((d) => {
              const budget = fmtBudget(d.monthlyBudget);
              const score = domainScores[d.id];
              return (
                <div key={d.id} className="tile flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium tracking-tight">{d.name}</h3>
                    <div className="flex items-center gap-2">
                      {score !== undefined ? (
                        <span
                          className={`text-sm font-semibold tabular-nums ${scoreColor(score)}`}
                          title="Conformance"
                        >
                          {score}
                        </span>
                      ) : null}
                      {d.conceptSlug ? (
                        <Link
                          href={`/wiki/${d.conceptSlug}`}
                          className="text-muted-foreground hover:text-primary"
                          title="Open wiki section"
                        >
                          <ArrowUpRight className="size-4 shrink-0" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {d.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {d.description}
                    </p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{d.models} models</span>
                    <span>{d.sources} sources</span>
                    {budget ? (
                      <span className="text-foreground/70">{budget}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
