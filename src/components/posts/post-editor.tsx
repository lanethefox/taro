"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deletePostAction, savePostAction } from "@/app/(app)/blog/actions";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import {
  RichTextEditor,
  type EditorHandle,
} from "@/components/editor/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { JSONContent } from "@/lib/content";

type Status = "draft" | "published";
type Visibility = "private" | "viewer" | "public";
type DecisionStatus = "proposed" | "accepted" | "superseded";

export type DecisionFields = {
  context: string;
  decision: string;
  consequences: string;
  status: DecisionStatus;
  supersedesId: string | null;
};

const selectCls =
  "h-8 rounded-md border bg-transparent px-2 text-sm text-foreground";
const areaCls =
  "min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm";

export function PostEditor({
  id,
  kind,
  slug,
  initialTitle,
  initialContent,
  initialStatus,
  initialVisibility,
  initialTags,
  initialDecision,
  supersedeOptions,
  linkMap,
}: {
  id: string;
  kind: "blog" | "decision";
  slug: string;
  initialTitle: string;
  initialContent: JSONContent | null;
  initialStatus: Status;
  initialVisibility: Visibility;
  initialTags: string[];
  initialDecision?: DecisionFields;
  supersedeOptions: { id: string; title: string }[];
  linkMap: Record<string, string>;
}) {
  const router = useRouter();
  const editorRef = useRef<EditorHandle>(null);
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [tagInput, setTagInput] = useState(initialTags.join(", "));
  const [decision, setDecision] = useState<DecisionFields>(
    initialDecision ?? {
      context: "",
      decision: "",
      consequences: "",
      status: "proposed",
      supersedesId: null,
    },
  );
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  const listPath = kind === "decision" ? "/decisions" : "/blog";

  function handleSave() {
    const content = editorRef.current?.getJSON() ?? { type: "doc" };
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startSaving(async () => {
      const res = await savePostAction({
        id,
        title,
        content: content as JSONContent,
        status,
        visibility,
        tags,
        decision: kind === "decision" ? decision : undefined,
      });
      if (res.ok) {
        toast.success("Saved");
        router.push(`${listPath}/${res.slug}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this post?")) return;
    startDeleting(async () => {
      await deletePostAction(id);
    });
  }

  function setD<K extends keyof DecisionFields>(key: K, value: DecisionFields[K]) {
    setDecision((d) => ({ ...d, [key]: value }));
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
            router.push(`${listPath}/${slug}`);
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
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === "decision" ? "Decision title" : "Post title"}
        className="mb-3 h-auto border-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5 text-muted-foreground">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className={selectCls}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
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
        <label className="flex flex-1 items-center gap-1.5 text-muted-foreground">
          Tags
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="comma, separated"
            className="h-8"
          />
        </label>
      </div>

      {kind === "decision" ? (
        <div className="mb-6 space-y-4 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Decision record</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-1.5 text-muted-foreground">
              State
              <select
                value={decision.status}
                onChange={(e) => setD("status", e.target.value as DecisionStatus)}
                className={selectCls}
              >
                <option value="proposed">Proposed</option>
                <option value="accepted">Accepted</option>
                <option value="superseded">Superseded</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-muted-foreground">
              Supersedes
              <select
                value={decision.supersedesId ?? ""}
                onChange={(e) => setD("supersedesId", e.target.value || null)}
                className={selectCls}
              >
                <option value="">None</option>
                {supersedeOptions
                  .filter((o) => o.id !== id)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="space-y-1">
            <Label>Context</Label>
            <textarea
              value={decision.context}
              onChange={(e) => setD("context", e.target.value)}
              className={areaCls}
              placeholder="What is the issue we're seeing that motivates this decision?"
            />
          </div>
          <div className="space-y-1">
            <Label>Decision</Label>
            <textarea
              value={decision.decision}
              onChange={(e) => setD("decision", e.target.value)}
              className={areaCls}
              placeholder="What is the change we're actually proposing or doing?"
            />
          </div>
          <div className="space-y-1">
            <Label>Consequences</Label>
            <textarea
              value={decision.consequences}
              onChange={(e) => setD("consequences", e.target.value)}
              className={areaCls}
              placeholder="What becomes easier or harder because of this change?"
            />
          </div>
        </div>
      ) : null}

      <RichTextEditor
        content={initialContent}
        editable
        linkMap={linkMap}
        handleRef={editorRef}
        renderToolbar={(editor) => <EditorToolbar editor={editor} />}
        className="min-h-[40vh]"
      />
    </div>
  );
}
