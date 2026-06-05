"use client";

import { ChevronDown, ChevronUp, KeyRound, Link2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ColumnDraft = {
  key: string;
  id?: string;
  name: string;
  dataType: string;
  description: string;
  isPk: boolean;
  isFk: boolean;
  testsInput: string;
};

let counter = 0;
export function newColumnDraft(): ColumnDraft {
  counter += 1;
  return {
    key: `new-${counter}`,
    name: "",
    dataType: "",
    description: "",
    isPk: false,
    isFk: false,
    testsInput: "",
  };
}

const cellCls = "h-8 rounded-md border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-1";

export function ColumnEditor({
  columns,
  onChange,
}: {
  columns: ColumnDraft[];
  onChange: (next: ColumnDraft[]) => void;
}) {
  function update(key: string, patch: Partial<ColumnDraft>) {
    onChange(columns.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }
  function remove(key: string) {
    onChange(columns.filter((c) => c.key !== key));
  }
  function move(key: string, dir: -1 | 1) {
    const i = columns.findIndex((c) => c.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= columns.length) return;
    const next = [...columns];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Columns</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...columns, newColumnDraft()])}
        >
          <Plus className="size-4" />
          Add column
        </Button>
      </div>

      {columns.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No columns yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[1.4fr_1fr_1.6fr_1.2fr_auto] gap-2 border-b bg-muted/40 px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span>Type</span>
            <span>Description</span>
            <span>Tests · keys</span>
            <span className="sr-only">Actions</span>
          </div>
          {columns.map((c, i) => (
            <div
              key={c.key}
              className="grid grid-cols-[1.4fr_1fr_1.6fr_1.2fr_auto] items-center gap-2 border-b px-2 py-1 last:border-b-0"
            >
              <Input
                value={c.name}
                onChange={(e) => update(c.key, { name: e.target.value })}
                placeholder="column_name"
                className={`${cellCls} font-mono`}
              />
              <Input
                value={c.dataType}
                onChange={(e) => update(c.key, { dataType: e.target.value })}
                placeholder="type"
                className={`${cellCls} font-mono`}
              />
              <Input
                value={c.description}
                onChange={(e) => update(c.key, { description: e.target.value })}
                placeholder="what it means"
                className={cellCls}
              />
              <Input
                value={c.testsInput}
                onChange={(e) => update(c.key, { testsInput: e.target.value })}
                placeholder="not_null, unique"
                className={cellCls}
              />
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  title={c.isPk ? "Primary key" : "Mark primary key"}
                  aria-pressed={c.isPk}
                  onClick={() => update(c.key, { isPk: !c.isPk })}
                  className={
                    "rounded p-1 " +
                    (c.isPk
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground/40 hover:text-muted-foreground")
                  }
                >
                  <KeyRound className="size-3.5" />
                </button>
                <button
                  type="button"
                  title={c.isFk ? "Foreign key" : "Mark foreign key"}
                  aria-pressed={c.isFk}
                  onClick={() => update(c.key, { isFk: !c.isFk })}
                  className={
                    "rounded p-1 " +
                    (c.isFk
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-muted-foreground/40 hover:text-muted-foreground")
                  }
                >
                  <Link2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Move up"
                  disabled={i === 0}
                  onClick={() => move(c.key, -1)}
                  className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  disabled={i === columns.length - 1}
                  onClick={() => move(c.key, 1)}
                  className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Remove column"
                  onClick={() => remove(c.key)}
                  className="rounded p-1 text-muted-foreground/40 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
