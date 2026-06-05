"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteCaseStudyAction,
  updateCaseStudyAction,
} from "@/app/(app)/case-studies/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Visibility = "private" | "viewer" | "public";

export function CaseStudySettings({
  id,
  initialName,
  initialScenario,
  initialVisibility,
}: {
  id: string;
  initialName: string;
  initialScenario: string;
  initialVisibility: Visibility;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [scenario, setScenario] = useState(initialScenario);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  function save() {
    startSave(async () => {
      const res = await updateCaseStudyAction({ id, name, scenario, visibility });
      if (res.ok) {
        toast.success("Saved");
        setOpen(false);
        router.replace(`/case-studies/${res.slug}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function remove() {
    if (!confirm("Delete this case study and all its tasks?")) return;
    startDelete(async () => {
      await deleteCaseStudyAction(id);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" />
        Settings
      </Button>
    );
  }

  return (
    <div className="tile w-full max-w-md space-y-3 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="cs-name">Name</Label>
        <Input id="cs-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cs-scenario">Scenario</Label>
        <textarea
          id="cs-scenario"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          placeholder="Describe the company and its data landscape…"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="cs-vis">Visibility</Label>
        <select
          id="cs-vis"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
          className="h-8 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="private">Private</option>
          <option value="viewer">Viewers</option>
          <option value="public">Public</option>
        </select>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          variant="ghost"
          className="ml-auto text-destructive hover:text-destructive"
          onClick={remove}
          disabled={deleting}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
