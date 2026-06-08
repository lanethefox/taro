"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Plus,
  ScanSearch,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type { AuditReport, FindingNode } from "@/db/queries/audit";
import { createRemediationAction } from "@/app/(app)/taro/remediation/actions";

function catalogHref(n: FindingNode): string {
  return n.nodeType === "model" ? `/catalog/models/${n.nodeId}` : `/catalog/sources/${n.nodeId}`;
}

export function AuditView({
  report,
  owner,
}: {
  report: AuditReport;
  owner: boolean;
}) {
  const [open, setOpen] = useState<string | null>(report.groups[0]?.check.key ?? null);
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  function track(checkKey: string, checkTitle: string, n: FindingNode) {
    const k = `${n.nodeType}:${n.nodeId}:${checkKey}`;
    start(async () => {
      const res = await createRemediationAction({
        nodeType: n.nodeType,
        nodeId: n.nodeId,
        checkKey,
        title: `${checkTitle}: ${n.name}`,
        domainId: n.domainId,
      });
      if (res.ok) {
        setTracked((s) => new Set(s).add(k));
        toast.success("Added to remediation backlog");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ScanSearch className="size-5" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Audit</h1>
          <p className="text-sm text-muted-foreground">
            Anti-patterns across the platform, grouped by principle. Track one to
            put it on the remediation backlog.
          </p>
        </div>
        <Link href="/taro/remediation" className="text-sm text-primary hover:underline">
          Backlog →
        </Link>
      </div>

      {report.groups.length === 0 ? (
        <div className="tile p-6 text-sm text-muted-foreground">
          No findings — every node passes every check. 🎉
        </div>
      ) : (
        <div className="space-y-2">
          {report.groups.map((g) => {
            const isOpen = open === g.check.key;
            return (
              <div key={g.check.key} className="tile overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : g.check.key)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
                  />
                  {g.check.severity === "error" ? (
                    <XCircle className="size-4 shrink-0 text-terracotta" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-wheat" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{g.check.title}</span>
                    <span className="text-xs text-muted-foreground">{g.check.description}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {g.fails + g.warns}
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-border/60 bg-muted/20 p-4">
                    {g.check.principleSlug ? (
                      <Link
                        href={`/wiki/${g.check.principleSlug}`}
                        className="mb-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        How to fix this
                        <ExternalLink className="size-3" />
                      </Link>
                    ) : null}
                    <ul className="space-y-1.5">
                      {g.nodes.map((n) => {
                        const k = `${n.nodeType}:${n.nodeId}:${g.check.key}`;
                        const isTracked = n.tracked || tracked.has(k);
                        return (
                          <li key={k} className="flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate">
                              <Link href={catalogHref(n)} className="hover:underline">
                                {n.name}
                              </Link>
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                {n.domainName ?? "unassigned"}
                              </span>
                            </span>
                            {g.check.key === "clean_sql" && n.nodeType === "model" ? (
                              <Link
                                href={`/taro/decompose/${n.nodeId}`}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input px-2 py-0.5 text-xs text-primary hover:bg-muted"
                              >
                                Inspect
                              </Link>
                            ) : null}
                            {owner ? (
                              isTracked ? (
                                <span className="shrink-0 text-xs text-muted-foreground">tracked</span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => track(g.check.key, g.check.title, n)}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input px-2 py-0.5 text-xs hover:bg-muted disabled:opacity-50"
                                >
                                  <Plus className="size-3" />
                                  Track
                                </button>
                              )
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
