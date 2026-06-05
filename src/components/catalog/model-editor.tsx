"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteModelAction, saveModelAction } from "@/app/(app)/catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ColumnEditor,
  type ColumnDraft,
} from "@/components/catalog/column-editor";
import {
  ConceptPicker,
  type ConceptOption,
} from "@/components/catalog/concept-picker";

type Layer = "staging" | "intermediate" | "marts";
type Materialization = "view" | "table" | "incremental" | "ephemeral";
type Visibility = "private" | "viewer" | "public";

const selectCls =
  "h-8 rounded-md border bg-transparent px-2 text-sm text-foreground";
const areaCls = "min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm";
const monoArea = `${areaCls} font-mono`;

export function ModelEditor({
  id,
  initialName,
  initialDescription,
  initialLayer,
  initialMaterialization,
  initialGrain,
  initialSqlNotes,
  initialFreshnessSla,
  initialExpectedVolume,
  initialMonitoringNotes,
  initialVisibility,
  initialColumns,
  conceptOptions,
  initialConceptIds,
}: {
  id: string;
  initialName: string;
  initialDescription: string;
  initialLayer: Layer;
  initialMaterialization: Materialization;
  initialGrain: string;
  initialSqlNotes: string;
  initialFreshnessSla: string;
  initialExpectedVolume: string;
  initialMonitoringNotes: string;
  initialVisibility: Visibility;
  initialColumns: ColumnDraft[];
  conceptOptions: ConceptOption[];
  initialConceptIds: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [layer, setLayer] = useState<Layer>(initialLayer);
  const [materialization, setMaterialization] =
    useState<Materialization>(initialMaterialization);
  const [grain, setGrain] = useState(initialGrain);
  const [sqlNotes, setSqlNotes] = useState(initialSqlNotes);
  const [freshnessSla, setFreshnessSla] = useState(initialFreshnessSla);
  const [expectedVolume, setExpectedVolume] = useState(initialExpectedVolume);
  const [monitoringNotes, setMonitoringNotes] = useState(initialMonitoringNotes);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [columns, setColumns] = useState<ColumnDraft[]>(initialColumns);
  const [conceptIds, setConceptIds] = useState<string[]>(initialConceptIds);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  function handleSave() {
    startSaving(async () => {
      const res = await saveModelAction({
        id,
        name,
        description,
        layer,
        materialization,
        grain,
        sqlNotes,
        freshnessSla,
        expectedVolume,
        monitoringNotes,
        visibility,
        columns: columns.map((c) => ({
          id: c.id,
          name: c.name,
          dataType: c.dataType,
          description: c.description,
          isPk: c.isPk,
          isFk: c.isFk,
          tests: c.testsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        })),
        conceptIds,
      });
      if (res.ok) {
        toast.success("Saved");
        router.push(`/catalog/models/${res.id}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this model?")) return;
    startDeleting(async () => {
      await deleteModelAction(id);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-4 flex items-center gap-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            router.push(`/catalog/models/${id}`);
            router.refresh();
          }}
        >
          <X className="size-4" />
          Cancel
        </Button>
        <Button
          variant="ghost"
          className="ml-auto text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="model_name"
        className="mb-4 h-auto border-0 px-0 font-mono text-3xl font-semibold shadow-none focus-visible:ring-0"
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5 text-muted-foreground">
          Layer
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value as Layer)}
            className={selectCls}
          >
            <option value="staging">Staging</option>
            <option value="intermediate">Intermediate</option>
            <option value="marts">Marts</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-muted-foreground">
          Materialization
          <select
            value={materialization}
            onChange={(e) => setMaterialization(e.target.value as Materialization)}
            className={selectCls}
          >
            <option value="view">View</option>
            <option value="table">Table</option>
            <option value="incremental">Incremental</option>
            <option value="ephemeral">Ephemeral</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-muted-foreground">
          Visibility
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className={selectCls}
          >
            <option value="private">Private</option>
            <option value="viewer">Viewers</option>
            <option value="public">Public</option>
          </select>
        </label>
      </div>

      <div className="mb-5 space-y-1">
        <Label>Grain</Label>
        <Input
          value={grain}
          onChange={(e) => setGrain(e.target.value)}
          placeholder="one row per …"
          className="h-8"
        />
      </div>

      <div className="mb-5 space-y-1">
        <Label>Description</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={areaCls}
          placeholder="What this model represents and how it's built."
        />
      </div>

      <div className="mb-5 space-y-1">
        <Label>SQL notes</Label>
        <textarea
          value={sqlNotes}
          onChange={(e) => setSqlNotes(e.target.value)}
          className={monoArea}
          placeholder="Logic, joins, gotchas — or a SQL sketch."
        />
      </div>

      <div className="mb-6 space-y-4 rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Observation metadata</p>
        <div className="space-y-1">
          <Label>Freshness SLA</Label>
          <Input
            value={freshnessSla}
            onChange={(e) => setFreshnessSla(e.target.value)}
            placeholder="e.g. < 6h behind source"
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label>Expected volume</Label>
          <Input
            value={expectedVolume}
            onChange={(e) => setExpectedVolume(e.target.value)}
            placeholder="e.g. ~2M rows/day"
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label>Monitoring notes</Label>
          <textarea
            value={monitoringNotes}
            onChange={(e) => setMonitoringNotes(e.target.value)}
            className={areaCls}
            placeholder="Alerts, owners, what to watch."
          />
        </div>
      </div>

      <div className="mb-6">
        <ColumnEditor columns={columns} onChange={setColumns} />
      </div>

      <div className="mb-6 rounded-lg border bg-card p-4">
        <ConceptPicker
          options={conceptOptions}
          selected={conceptIds}
          onChange={setConceptIds}
        />
      </div>
    </div>
  );
}
