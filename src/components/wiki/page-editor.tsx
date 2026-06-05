"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  deletePageAction,
  savePageAction,
} from "@/app/(app)/wiki/actions";
import {
  RichTextEditor,
  type EditorHandle,
} from "@/components/editor/rich-text-editor";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JSONContent } from "@/lib/content";

type Visibility = "private" | "viewer" | "public";

export function PageEditor({
  id,
  slug,
  initialTitle,
  initialContent,
  initialParentId,
  initialVisibility,
  initialTags,
  parentOptions,
  linkMap,
}: {
  id: string;
  slug: string;
  initialTitle: string;
  initialContent: JSONContent | null;
  initialParentId: string | null;
  initialVisibility: Visibility;
  initialTags: string[];
  parentOptions: { id: string; title: string }[];
  linkMap: Record<string, string>;
}) {
  const router = useRouter();
  const editorRef = useRef<EditorHandle>(null);
  const [title, setTitle] = useState(initialTitle);
  const [parentId, setParentId] = useState<string>(initialParentId ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [tagInput, setTagInput] = useState(initialTags.join(", "));
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  function handleSave() {
    const content = editorRef.current?.getJSON() ?? { type: "doc" };
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    startSaving(async () => {
      const res = await savePageAction({
        id,
        title,
        content: content as JSONContent,
        parentId: parentId || null,
        visibility,
        tags,
      });
      if (res.ok) {
        toast.success("Saved");
        router.push(`/wiki/${res.slug}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this page? Child pages move up to its parent.")) return;
    startDeleting(async () => {
      await deletePageAction(id);
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
            router.push(`/wiki/${slug}`);
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
        placeholder="Page title"
        className="mb-3 h-auto border-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0 md:text-3xl"
      />

      <div className="mb-5 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-1.5 text-muted-foreground">
          Parent
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="h-8 rounded-md border bg-transparent px-2 text-foreground"
          >
            <option value="">— None</option>
            {parentOptions
              .filter((p) => p.id !== id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-muted-foreground">
          Visibility
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="h-8 rounded-md border bg-transparent px-2 text-foreground"
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

      <RichTextEditor
        content={initialContent}
        editable
        linkMap={linkMap}
        handleRef={editorRef}
        renderToolbar={(editor) => <EditorToolbar editor={editor} />}
        className="min-h-[50vh]"
      />
    </div>
  );
}
