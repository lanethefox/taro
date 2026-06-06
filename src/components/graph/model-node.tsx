"use client";

import Link from "next/link";
import { Handle, Position, type NodeProps } from "reactflow";

import { NODE_W } from "@/lib/graph/dag-layout";

export type ModelNodeData = {
  name: string;
  layer: "staging" | "intermediate" | "marts";
  materialization: "view" | "table" | "incremental" | "ephemeral";
  grain: string | null;
};

const LAYER: Record<ModelNodeData["layer"], { label: string; dot: string }> = {
  staging: { label: "staging", dot: "#74a0bb" },
  intermediate: { label: "intermediate", dot: "#e6c25f" },
  marts: { label: "marts", dot: "#8fae7f" },
};

/** Compact model node shared by the lineage graph (and reused by the ERD). */
export function ModelNode({ id, data }: NodeProps<ModelNodeData>) {
  const layer = LAYER[data.layer];
  return (
    <Link
      href={`/catalog/models/${id}`}
      className="block rounded-lg border bg-card px-3 py-2 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent"
      style={{ width: NODE_W }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-1.5 !border-0 !bg-muted-foreground"
      />
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: layer.dot }} />
        {layer.label}
        <span className="text-muted-foreground/50">·</span>
        {data.materialization}
      </div>
      <div className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">
        {data.name}
      </div>
      {data.grain ? (
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          grain: {data.grain}
        </div>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        className="!size-1.5 !border-0 !bg-muted-foreground"
      />
    </Link>
  );
}
