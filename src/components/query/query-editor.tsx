"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  runGraphqlAction,
  runSqlAction,
  type GqlActionResult,
  type SqlActionResult,
} from "@/app/(app)/query/actions";

type Mode = "sql" | "graphql";

const SAMPLE: Record<Mode, string> = {
  sql: "select name, layer, materialization, grain\nfrom models\norder by layer, name\nlimit 50;",
  graphql: `{
  modelsCollection(first: 20) {
    edges { node { id name layer } }
  }
}`,
};

function cell(v: unknown): string {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function QueryEditor() {
  const [mode, setMode] = useState<Mode>("sql");
  const [text, setText] = useState(SAMPLE.sql);
  const [sqlOut, setSqlOut] = useState<SqlActionResult | null>(null);
  const [gqlOut, setGqlOut] = useState<GqlActionResult | null>(null);
  const [pending, start] = useTransition();

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setText((t) => (t === SAMPLE[mode] || t.trim() === "" ? SAMPLE[next] : t));
    setSqlOut(null);
    setGqlOut(null);
  }

  function run() {
    start(async () => {
      if (mode === "sql") {
        setGqlOut(null);
        setSqlOut(await runSqlAction(text));
      } else {
        setSqlOut(null);
        setGqlOut(await runGraphqlAction(text));
      }
    });
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm">
          {(["sql", "graphql"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "sql" ? "SQL" : "GraphQL"}
            </button>
          ))}
        </div>
        <Button onClick={run} disabled={pending} className="gap-1.5">
          <Play className="size-4" />
          {pending ? "Running…" : "Run"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {mode === "sql"
            ? "Read-only · 15s timeout · 500-row cap"
            : "Supabase pg_graphql"}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">⌘/Ctrl+Enter</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            run();
          }
        }}
        spellCheck={false}
        className="h-44 w-full resize-y rounded-lg border bg-card p-3 font-mono text-sm text-foreground shadow-inner outline-none focus:ring-2 focus:ring-ring/40"
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card">
        {sqlOut ? <SqlResult out={sqlOut} /> : null}
        {gqlOut ? <GqlResult out={gqlOut} /> : null}
        {!sqlOut && !gqlOut ? (
          <p className="p-4 text-sm text-muted-foreground">
            Results appear here. Run a query to begin.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <pre className="m-3 whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      {error}
    </pre>
  );
}

function SqlResult({ out }: { out: SqlActionResult }) {
  if (!out.ok) return <ErrorBox error={out.error} />;
  const { columns, rows, rowCount, truncated } = out.data;
  if (rows.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">0 rows.</p>;
  }
  return (
    <div>
      <div className="border-b px-3 py-1.5 text-xs text-muted-foreground">
        {rowCount} {rowCount === 1 ? "row" : "rows"}
        {truncated ? ` · showing first ${rows.length}` : ""}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-muted/70 backdrop-blur">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-1.5 font-mono text-xs font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t hover:bg-muted/40">
              {columns.map((c) => (
                <td key={c} className="max-w-[28rem] truncate px-3 py-1.5 font-mono text-xs" title={cell(r[c])}>
                  {cell(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GqlResult({ out }: { out: GqlActionResult }) {
  if (!out.ok) return <ErrorBox error={out.error} />;
  return (
    <pre className="overflow-auto p-3 font-mono text-xs text-foreground">
      {JSON.stringify(out.result, null, 2)}
    </pre>
  );
}
