"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Gauge,
  Pencil,
  XCircle,
} from "lucide-react";

import type { CheckMeta, ScoredNode } from "@/db/queries/conformance";
import type { CheckStatus } from "@/lib/conformance/checks";

function scoreColor(score: number): string {
  if (score >= 80) return "text-sage";
  if (score >= 50) return "text-wheat";
  return "text-terracotta";
}
function barColor(score: number): string {
  if (score >= 80) return "bg-sage";
  if (score >= 50) return "bg-wheat";
  return "bg-terracotta";
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "pass") return <CheckCircle2 className="size-4 text-sage" />;
  if (status === "warn") return <AlertTriangle className="size-4 text-wheat" />;
  if (status === "fail") return <XCircle className="size-4 text-terracotta" />;
  return null;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barColor(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`w-9 text-right text-sm font-semibold tabular-nums ${scoreColor(score)}`}>
        {score}
      </span>
    </div>
  );
}

function NodeRow({
  node,
  checkByKey,
}: {
  node: ScoredNode;
  checkByKey: Map<string, CheckMeta>;
}) {
  const [open, setOpen] = useState(false);
  const editHref =
    node.type === "model"
      ? `/catalog/models/${node.id}`
      : `/catalog/sources/${node.id}`;
  const visible = node.results.filter((r) => r.status !== "na");
  const problems = visible.filter((r) => r.status !== "pass").length;

  return (
    <div className="tile overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
      >
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{node.name}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {node.type}
              {node.layer ? ` · ${node.layer}` : ""}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            {problems === 0 ? "All checks pass" : `${problems} to address`}
          </span>
        </span>
        <ScoreBar score={node.score} />
      </button>

      {open ? (
        <div className="border-t border-border/60 bg-muted/20 p-4">
          <ul className="space-y-1.5">
            {node.results
              .filter((r) => r.status !== "na")
              .sort((a, b) => (a.status === "pass" ? 1 : 0) - (b.status === "pass" ? 1 : 0))
              .map((r) => {
                const meta = checkByKey.get(r.key);
                return (
                  <li key={r.key} className="flex items-center gap-2 text-sm">
                    <StatusIcon status={r.status} />
                    <span className={r.status === "pass" ? "text-muted-foreground" : ""}>
                      {meta?.title ?? r.key}
                    </span>
                    {r.status !== "pass" && meta?.principleSlug ? (
                      <Link
                        href={`/wiki/${meta.principleSlug}`}
                        className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                      >
                        how to fix
                        <ExternalLink className="size-3" />
                      </Link>
                    ) : null}
                  </li>
                );
              })}
          </ul>
          <div className="mt-3">
            <Link
              href={editHref}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3" />
              Open in catalog
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ConformanceScorecard({
  platformScore,
  nodes,
  checks,
  domainNames,
}: {
  platformScore: number | null;
  nodes: ScoredNode[];
  checks: CheckMeta[];
  domainNames: Record<string, string>;
}) {
  const [domain, setDomain] = useState<string>("all");
  const [layer, setLayer] = useState<string>("all");
  const checkByKey = useMemo(() => new Map(checks.map((c) => [c.key, c])), [checks]);

  const domainOptions = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.domainId).filter((x): x is string => Boolean(x)));
    return [...ids].map((id) => ({ id, name: domainNames[id] ?? "Unknown" }));
  }, [nodes, domainNames]);

  const filtered = useMemo(() => {
    return nodes
      .filter((n) => (domain === "all" ? true : domain === "none" ? !n.domainId : n.domainId === domain))
      .filter((n) => (layer === "all" ? true : n.layer === layer))
      .slice()
      .sort((a, b) => a.score - b.score);
  }, [nodes, domain, layer]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Gauge className="size-5" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Conformance</h1>
          <p className="text-sm text-muted-foreground">
            Every node scored against the principles. Worst first.
          </p>
        </div>
        {platformScore !== null ? (
          <div className="text-right">
            <div className={`text-3xl font-semibold tabular-nums ${scoreColor(platformScore)}`}>
              {platformScore}
            </div>
            <div className="text-xs text-muted-foreground">platform</div>
          </div>
        ) : null}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5"
        >
          <option value="all">All arms</option>
          {domainOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
          <option value="none">Unassigned</option>
        </select>
        <select
          value={layer}
          onChange={(e) => setLayer(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5"
        >
          <option value="all">All layers</option>
          <option value="staging">Staging</option>
          <option value="intermediate">Intermediate</option>
          <option value="marts">Marts</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} nodes</span>
      </div>

      <div className="space-y-2">
        {filtered.map((n) => (
          <NodeRow key={`${n.type}:${n.id}`} node={n} checkByKey={checkByKey} />
        ))}
      </div>
    </div>
  );
}
