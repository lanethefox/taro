"use client";

import { Handle, Position, type NodeProps } from "reactflow";

import { cn } from "@/lib/utils";

export const TABLE_NODE_W = 230;

export type TableNodeColumn = {
  id: string;
  name: string;
  dataType: string | null;
  isPk: boolean;
  isFk: boolean;
};

export type TableNodeData = {
  name: string;
  layer: "staging" | "intermediate" | "marts";
  materialization: "view" | "table" | "incremental" | "ephemeral";
  columns: TableNodeColumn[];
  /** Owner-only: enables per-column connection handles for drawing relationships. */
  connectable: boolean;
  /** Owner-only: shows the remove (✕) affordance. */
  removable: boolean;
  onRemove?: () => void;
};

const LAYER: Record<TableNodeData["layer"], { label: string; dot: string }> = {
  staging: { label: "staging", dot: "#74a0bb" },
  intermediate: { label: "intermediate", dot: "#e6c25f" },
  marts: { label: "marts", dot: "#8fae7f" },
};

/**
 * Richer ERD table node: a model header (name + layer/materialization) over a
 * list of columns. Each column carries a target handle on its left and a source
 * handle on its right (handle id = columnId, node id = modelId) so relationships
 * can be drawn column-to-column. Read-only when `connectable` is false.
 */
export function TableNode({ data }: NodeProps<TableNodeData>) {
  const layer = LAYER[data.layer];
  return (
    <div
      className="overflow-hidden rounded-lg border bg-card shadow-sm"
      style={{ width: TABLE_NODE_W }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: layer.dot }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-sm font-semibold text-foreground">
            {data.name}
          </div>
          <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {layer.label} · {data.materialization}
          </div>
        </div>
        {data.removable ? (
          <button
            type="button"
            aria-label={`Remove ${data.name} from diagram`}
            onClick={(e) => {
              e.stopPropagation();
              data.onRemove?.();
            }}
            className="nodrag shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-3.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Columns */}
      {data.columns.length === 0 ? (
        <div className="px-3 py-2 text-[11px] italic text-muted-foreground">
          No columns defined.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {data.columns.map((c) => (
            <li
              key={c.id}
              className="relative flex items-center gap-2 px-3 py-1.5 text-xs"
            >
              {data.connectable ? (
                <>
                  <Handle
                    id={c.id}
                    type="target"
                    position={Position.Left}
                    className="!size-2 !border-0 !bg-muted-foreground"
                  />
                  <Handle
                    id={c.id}
                    type="source"
                    position={Position.Right}
                    className="!size-2 !border-0 !bg-primary"
                  />
                </>
              ) : null}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-mono",
                  c.isPk ? "font-semibold text-foreground" : "text-foreground/90",
                )}
              >
                {c.name}
              </span>
              {c.dataType ? (
                <span className="shrink-0 truncate font-mono text-[10px] text-muted-foreground">
                  {c.dataType}
                </span>
              ) : null}
              {c.isPk ? (
                <span className="shrink-0 rounded bg-primary/10 px-1 text-[9px] font-semibold uppercase text-primary">
                  PK
                </span>
              ) : null}
              {c.isFk ? (
                <span className="shrink-0 rounded bg-muted px-1 text-[9px] font-semibold uppercase text-muted-foreground">
                  FK
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
