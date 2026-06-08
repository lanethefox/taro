"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ClipboardList, FlaskConical, Loader2, RefreshCw, ScanSearch } from "lucide-react";
import { toast } from "sonner";

import type { RemediationStatus, RemediationView } from "@/db/queries/remediation";
import {
  recheckRemediationsAction,
  scanLegacyAction,
  setRemediationStatusAction,
} from "@/app/(app)/taro/remediation/actions";
import { Button } from "@/components/ui/button";

const STATUSES: { key: RemediationStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "wontfix", label: "Won't fix" },
];

function catalogHref(r: RemediationView): string {
  return r.nodeType === "model" ? `/catalog/models/${r.nodeId}` : `/catalog/sources/${r.nodeId}`;
}

function Item({ r, owner }: { r: RemediationView; owner: boolean }) {
  const [pending, start] = useTransition();
  function change(status: RemediationStatus) {
    start(async () => {
      const res = await setRemediationStatusAction({ id: r.id, status });
      if (!res.ok) toast.error(res.error);
    });
  }
  return (
    <div className="tile flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{r.title}</div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <Link href={catalogHref(r)} className="hover:underline">
            {r.nodeName}
          </Link>
          {r.domainName ? <span>· {r.domainName}</span> : null}
          {r.checkTitle ? <span>· {r.checkTitle}</span> : null}
        </div>
      </div>
      {r.checkKey === "clean_sql" && r.nodeType === "model" ? (
        <Link
          href={`/taro/decompose/${r.nodeId}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-primary hover:bg-muted"
        >
          <FlaskConical className="size-3" />
          Inspect
        </Link>
      ) : null}
      {owner ? (
        <select
          value={r.status}
          disabled={pending}
          onChange={(e) => change(e.target.value as RemediationStatus)}
          className="shrink-0 rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">
          {STATUSES.find((s) => s.key === r.status)?.label}
        </span>
      )}
    </div>
  );
}

export function RemediationBoard({
  items,
  owner,
}: {
  items: RemediationView[];
  owner: boolean;
}) {
  const [pending, start] = useTransition();
  const active = items.filter((r) => r.status === "open" || r.status === "in_progress");
  const resolved = items.filter((r) => r.status === "done" || r.status === "wontfix");

  function recheck() {
    start(async () => {
      const res = await recheckRemediationsAction();
      if (res.ok) toast.success(res.closed > 0 ? `Closed ${res.closed} now passing` : "Nothing to close yet");
      else toast.error(res.error);
    });
  }

  function scan() {
    start(async () => {
      const res = await scanLegacyAction();
      if (res.ok)
        toast.success(res.created > 0 ? `Caught ${res.created} legacy model(s)` : "No new legacy models");
      else toast.error(res.error);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="size-5" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Remediation</h1>
          <p className="text-sm text-muted-foreground">
            The AE backlog. Closes automatically when a check passes again.
          </p>
        </div>
        {owner ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={scan}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
              Scan legacy
            </Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={recheck}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Re-check
            </Button>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="tile p-6 text-sm text-muted-foreground">
          Nothing in the backlog. Track findings from the{" "}
          <Link href="/taro/audit" className="text-primary hover:underline">
            audit
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Active <span className="tabular-nums">({active.length})</span>
            </h2>
            <div className="space-y-2">
              {active.length === 0 ? (
                <div className="tile p-4 text-sm text-muted-foreground">All clear.</div>
              ) : (
                active.map((r) => <Item key={r.id} r={r} owner={owner} />)
              )}
            </div>
          </section>

          {resolved.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Resolved <span className="tabular-nums">({resolved.length})</span>
              </h2>
              <div className="space-y-2 opacity-70">
                {resolved.map((r) => (
                  <Item key={r.id} r={r} owner={owner} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
