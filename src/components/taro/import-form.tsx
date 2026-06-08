"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, FileJson, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  importDbtAction,
  type ImportActionResult,
} from "@/app/(app)/taro/import/actions";
import { Button } from "@/components/ui/button";

type Files = { manifest?: string; catalog?: string; runResults?: string };

async function readFile(input: HTMLInputElement | null): Promise<string | undefined> {
  const file = input?.files?.[0];
  return file ? file.text() : undefined;
}

function FilePick({
  label,
  required,
  hint,
  inputRef,
  picked,
  onPick,
}: {
  label: string;
  required?: boolean;
  hint: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <label className="tile flex cursor-pointer items-center gap-3 p-4 transition-colors hover:border-primary/40">
      <span
        className={`flex size-9 items-center justify-center rounded-lg ${
          picked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {picked ? <CheckCircle2 className="size-4" /> : <FileJson className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">
          {label}
          {required ? <span className="text-terracotta"> *</span> : null}
        </div>
        <div className="truncate text-xs text-muted-foreground">{hint}</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onPick}
      />
    </label>
  );
}

function SummaryView({ result }: { result: ImportActionResult }) {
  if (!result.ok) {
    return (
      <div className="tile border-terracotta/40 p-4 text-sm text-terracotta">
        {result.error}
      </div>
    );
  }
  const { summary, stats, dryRun } = result;
  const rows: [string, string][] = [
    ["Models", `${summary.models.created} new, ${summary.models.updated} updated`],
    ["Sources", `${summary.sources.created} new, ${summary.sources.updated} updated`],
    ["Columns", String(summary.columns)],
    ["Lineage edges", String(summary.dependencies)],
    ["Relationships", String(summary.relationships)],
    ["Usage (run timings)", `${summary.usagePeriods} nodes`],
    ["Tests parsed", String(stats.tests)],
  ];
  return (
    <div className="tile p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <CheckCircle2 className="size-4 text-sage" />
        {dryRun ? "Preview — nothing written yet" : "Import applied"}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ImportForm() {
  const manifestRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLInputElement>(null);
  const runResultsRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Files>({});
  const [result, setResult] = useState<ImportActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    setPicked({
      manifest: manifestRef.current?.files?.[0]?.name,
      catalog: catalogRef.current?.files?.[0]?.name,
      runResults: runResultsRef.current?.files?.[0]?.name,
    });
    setResult(null);
  }

  function run(dryRun: boolean) {
    startTransition(async () => {
      const manifest = await readFile(manifestRef.current);
      if (!manifest) {
        toast.error("Choose a manifest.json first");
        return;
      }
      const catalog = await readFile(catalogRef.current);
      const runResults = await readFile(runResultsRef.current);
      const res = await importDbtAction({ manifest, catalog, runResults, dryRun });
      setResult(res);
      if (!res.ok) toast.error(res.error);
      else if (!dryRun) toast.success("Import applied");
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        <FilePick
          label="manifest.json"
          required
          hint={picked.manifest ?? "Models, sources, columns, tests, lineage"}
          inputRef={manifestRef}
          picked={Boolean(picked.manifest)}
          onPick={refresh}
        />
        <FilePick
          label="catalog.json"
          hint={picked.catalog ?? "Column data types (optional)"}
          inputRef={catalogRef}
          picked={Boolean(picked.catalog)}
          onPick={refresh}
        />
        <FilePick
          label="run_results.json"
          hint={picked.runResults ?? "Execution timings → FinOps usage (optional)"}
          inputRef={runResultsRef}
          picked={Boolean(picked.runResults)}
          onPick={refresh}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          disabled={pending || !picked.manifest}
          onClick={() => run(true)}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Analyze
        </Button>
        <Button disabled={pending || !picked.manifest} onClick={() => run(false)}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Apply import
        </Button>
      </div>

      {result ? <SummaryView result={result} /> : null}
    </div>
  );
}
