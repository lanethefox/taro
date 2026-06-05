"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTaskAction, saveTaskAction } from "@/app/(app)/case-studies/actions";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import {
  RichTextEditor,
  type EditorHandle,
} from "@/components/editor/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JSONContent } from "@/lib/content";
import { cn } from "@/lib/utils";

type Status = "todo" | "in_progress" | "done";

const STATUSES: { value: Status; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function TaskWorkspace({
  id,
  caseSlug,
  category,
  initialTitle,
  initialContent,
  initialStatus,
  linkMap,
}: {
  id: string;
  caseSlug: string;
  category: string | null;
  initialTitle: string;
  initialContent: JSONContent | null;
  initialStatus: Status;
  linkMap: Record<string, string>;
}) {
  const router = useRouter();
  const editorRef = useRef<EditorHandle>(null);
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  function save() {
    const content = editorRef.current?.getJSON() ?? { type: "doc" };
    startSave(async () => {
      const res = await saveTaskAction({
        id,
        title,
        content: content as JSONContent,
        status,
      });
      if (res.ok) {
        toast.success("Saved");
        router.replace(`/case-studies/${res.caseSlug}/${res.taskSlug}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function remove() {
    if (!confirm("Delete this task?")) return;
    startDelete(async () => {
      await deleteTaskAction(id);
      router.push(`/case-studies/${caseSlug}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-4 flex items-center gap-2">
        <Button onClick={save} disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <div className="ml-1 inline-flex overflow-hidden rounded-lg border">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                status === s.value
                  ? "bg-sage text-white"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
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

      {category ? (
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {category}
        </span>
      ) : null}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="mb-4 h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
      />

      <RichTextEditor
        content={initialContent}
        editable
        linkMap={linkMap}
        handleRef={editorRef}
        renderToolbar={(editor) => <EditorToolbar editor={editor} />}
        className="min-h-[45vh]"
      />
    </div>
  );
}
