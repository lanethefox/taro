"use client";

import { useMemo } from "react";
import Link from "next/link";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

import type { GraphViewNode, KnowledgeGraph } from "@/db/queries/graph";
import type { ForceLayout } from "@/lib/graph/force-layout";

const C = {
  page: "#7c9a6d",
  concept: "#e0b341",
  blog: "#5b8aa6",
  decision: "#c8794b",
  model: "#5e7a52",
  source: "#9a7aa6",
  case_study: "#6d6a9a",
  task: "#8a8170",
};

function colorFor(n: GraphViewNode): string {
  if (n.type === "page") return n.kind === "concept" ? C.concept : C.page;
  if (n.type === "post") return n.kind === "decision" ? C.decision : C.blog;
  return C[n.type];
}

/** Legend rows (label + swatch) describing the node palette. */
export const GRAPH_LEGEND: Array<{ label: string; color: string }> = [
  { label: "Page", color: C.page },
  { label: "Concept", color: C.concept },
  { label: "Blog", color: C.blog },
  { label: "Decision", color: C.decision },
  { label: "Model", color: C.model },
  { label: "Source", color: C.source },
  { label: "Case study", color: C.case_study },
  { label: "Task", color: C.task },
];

type NodeData = { label: string; color: string; href: string };

function GraphNode({ data }: NodeProps<NodeData>) {
  return (
    <Link
      href={data.href}
      className="flex items-center gap-1.5 transition-transform hover:scale-105"
    >
      <Handle type="target" position={Position.Left} className="!size-0 !border-0 !bg-transparent" />
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ background: data.color, boxShadow: `0 0 0 3px ${data.color}22` }}
      />
      <span className="max-w-[150px] truncate rounded-md border bg-card/90 px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
        {data.label}
      </span>
      <Handle type="source" position={Position.Right} className="!size-0 !border-0 !bg-transparent" />
    </Link>
  );
}

const nodeTypes = { graph: GraphNode };

export function KnowledgeGraphView({
  graph,
  layout,
}: {
  graph: KnowledgeGraph;
  layout: ForceLayout;
}) {
  const pos = useMemo(
    () => new Map(layout.positions.map((p) => [p.id, p] as const)),
    [layout],
  );

  const nodes = useMemo<Node<NodeData>[]>(
    () =>
      graph.nodes.map((n) => {
        const p = pos.get(n.id);
        return {
          id: n.id,
          type: "graph",
          position: { x: p?.x ?? 0, y: p?.y ?? 0 },
          data: { label: n.label, color: colorFor(n), href: n.href },
        };
      }),
    [graph, pos],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        style: { stroke: "#bdb198", strokeWidth: 1 },
      })),
    [graph],
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border bg-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d8cfbb" gap={22} />
        <Controls showInteractive={false} className="!shadow-sm" />
        <MiniMap pannable zoomable className="!bg-background" nodeColor={(n) => (n.data as NodeData).color} />
      </ReactFlow>

      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border bg-card/90 px-3 py-2 text-[10px] shadow-sm backdrop-blur">
        {GRAPH_LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
