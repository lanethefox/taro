"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeChange,
  type NodeDragHandler,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  addModelToDiagramAction,
  createRelationshipAction,
  deleteRelationshipAction,
  removeModelFromDiagramAction,
  saveNodePositionsAction,
} from "@/app/(app)/erd/actions";
import type { DiagramData } from "@/db/queries/erd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TABLE_NODE_W, TableNode, type TableNodeData } from "./table-node";

const nodeTypes = { table: TableNode };

const EDGE_COLOR = "#9a8f78";
const CARD_LABEL: Record<DiagramData["relationships"][number]["cardinality"], string> =
  {
    one_to_one: "1:1",
    one_to_many: "1:N",
    many_to_many: "N:N",
  };

export type CatalogModelOption = {
  id: string;
  name: string;
  layer: "staging" | "intermediate" | "marts";
};

type Props = {
  data: DiagramData;
  /** Owner-only: enables add/connect/drag-persist/delete. */
  editable: boolean;
  /** Catalog models NOT yet on the diagram (for the "Add model" control). */
  available: CatalogModelOption[];
};

export function ErdCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <ErdCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function ErdCanvasInner({ data, editable, available }: Props) {
  const { diagram } = data;
  const { screenToFlowPosition } = useReactFlow();

  const removeModel = useCallback(
    (modelId: string) => {
      void removeModelFromDiagramAction({ diagramId: diagram.id, modelId });
    },
    [diagram.id],
  );

  const initialNodes = useMemo<Node<TableNodeData>[]>(
    () =>
      data.models.map((m) => ({
        id: m.modelId,
        type: "table",
        position: { x: m.x, y: m.y },
        data: {
          name: m.name,
          layer: m.layer,
          materialization: m.materialization,
          columns: m.columns.map((c) => ({
            id: c.id,
            name: c.name,
            dataType: c.dataType,
            isPk: c.isPk,
            isFk: c.isFk,
          })),
          connectable: editable,
          removable: editable,
          onRemove: () => removeModel(m.modelId),
        },
      })),
    [data.models, editable, removeModel],
  );

  // Keep node state in sync when the server data changes (add/remove model,
  // column edits). We store the placed-model signature in state and adjust
  // during render — React's recommended pattern for deriving state from props —
  // so unrelated re-renders don't clobber an in-flight drag.
  const signature = useMemo(
    () =>
      data.models
        .map((m) => `${m.modelId}:${m.columns.length}:${m.name}`)
        .join("|"),
    [data.models],
  );
  const [nodes, setNodes] = useState<Node<TableNodeData>[]>(initialNodes);
  const [syncedSignature, setSyncedSignature] = useState(signature);
  if (syncedSignature !== signature) {
    setSyncedSignature(signature);
    setNodes(initialNodes);
  }

  const edges = useMemo<Edge[]>(
    () =>
      data.relationships.map((r) => ({
        id: r.id,
        source: r.fromModelId,
        target: r.toModelId,
        sourceHandle: r.fromColumnId ?? undefined,
        targetHandle: r.toColumnId ?? undefined,
        type: "smoothstep",
        label: CARD_LABEL[r.cardinality],
        labelStyle: { fill: "#5b5346", fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: "#f4eede" },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: EDGE_COLOR,
        },
        style: { stroke: EDGE_COLOR, strokeWidth: 1.5 },
      })),
    [data.relationships],
  );

  /* ---- Drag persistence (debounced) ------------------------------------- */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(new Map<string, { x: number; y: number }>());

  const flush = useCallback(() => {
    const batch = Array.from(pending.current.entries()).map(([modelId, p]) => ({
      modelId,
      x: p.x,
      y: p.y,
    }));
    pending.current.clear();
    if (batch.length === 0) return;
    void saveNodePositionsAction({ diagramId: diagram.id, nodes: batch });
  }, [diagram.id]);

  const queueSave = useCallback(
    (modelId: string, x: number, y: number) => {
      pending.current.set(modelId, { x, y });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 600);
    },
    [flush],
  );

  useEffect(() => () => flush(), [flush]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  );

  const onNodeDragStop: NodeDragHandler = useCallback(
    (_e, node) => {
      if (!editable) return;
      queueSave(node.id, node.position.x, node.position.y);
    },
    [editable, queueSave],
  );

  /* ---- Draw relationships ----------------------------------------------- */
  const onConnect = useCallback(
    (conn: Connection) => {
      if (!editable || !conn.source || !conn.target) return;
      void createRelationshipAction({
        diagramId: diagram.id,
        fromModelId: conn.source,
        fromColumnId: conn.sourceHandle ?? null,
        toModelId: conn.target,
        toColumnId: conn.targetHandle ?? null,
        cardinality: "one_to_many",
      });
    },
    [diagram.id, editable],
  );

  /* ---- Delete a relationship (select edge → click delete) --------------- */
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const onEdgeClick: EdgeMouseHandler = useCallback((_e, edge) => {
    setSelectedEdge(edge.id);
  }, []);
  const onPaneClick = useCallback(() => setSelectedEdge(null), []);

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdge) return;
    void deleteRelationshipAction({
      diagramId: diagram.id,
      relationshipId: selectedEdge,
    });
    setSelectedEdge(null);
  }, [selectedEdge, diagram.id]);

  /* ---- Add a model ------------------------------------------------------- */
  const addModel = useCallback(
    (modelId: string) => {
      // Drop new tables near the centre of the current viewport.
      const pos = screenToFlowPosition({
        x: window.innerWidth / 2 - TABLE_NODE_W / 2,
        y: 200,
      });
      void addModelToDiagramAction({
        diagramId: diagram.id,
        modelId,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
      });
    },
    [diagram.id, screenToFlowPosition],
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border bg-card">
      {editable ? (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button size="sm" variant="default" />}
              disabled={available.length === 0}
            >
              <Plus className="size-4" />
              Add model
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 min-w-52">
              {available.length === 0 ? (
                <DropdownMenuItem disabled>All models placed</DropdownMenuItem>
              ) : (
                available.map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => addModel(m.id)}>
                    <span className="truncate font-mono text-xs">{m.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {m.layer}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedEdge ? (
            <Button size="sm" variant="destructive" onClick={deleteSelectedEdge}>
              Delete relationship
            </Button>
          ) : null}
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={editable ? onNodesChange : undefined}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable={editable}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d8cfbb" gap={20} />
        <Controls showInteractive={false} className="!shadow-sm" />
        <MiniMap pannable zoomable className="!bg-background" nodeColor="#cdbfa3" />
      </ReactFlow>
    </div>
  );
}
