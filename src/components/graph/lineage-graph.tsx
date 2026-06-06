"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import type { DagLayout } from "@/lib/graph/dag-layout";
import { ModelNode, type ModelNodeData } from "./model-node";

const nodeTypes = { model: ModelNode };

const EDGE_COLOR = "#9a8f78";

/** Read-only React Flow rendering of the model dependency DAG. */
export function LineageGraph({ layout }: { layout: DagLayout }) {
  const nodes = useMemo<Node<ModelNodeData>[]>(
    () =>
      layout.nodes.map((n) => ({
        id: n.id,
        type: "model",
        position: { x: n.x, y: n.y },
        data: {
          name: n.name,
          layer: n.layer,
          materialization: n.materialization,
          grain: n.grain,
        },
      })),
    [layout],
  );

  const edges = useMemo<Edge[]>(
    () =>
      layout.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: EDGE_COLOR },
        style: { stroke: EDGE_COLOR, strokeWidth: 1.5 },
      })),
    [layout],
  );

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border bg-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d8cfbb" gap={20} />
        <Controls showInteractive={false} className="!shadow-sm" />
        <MiniMap pannable zoomable className="!bg-background" nodeColor="#cdbfa3" />
      </ReactFlow>
    </div>
  );
}
