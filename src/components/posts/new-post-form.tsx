import Link from "next/link";

import { createPostAction } from "@/app/(app)/blog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewPostForm({
  kind,
  error,
}: {
  kind: "blog" | "decision";
  error?: string;
}) {
  const basePath = kind === "decision" ? "/decisions" : "/blog";
  const noun = kind === "decision" ? "decision record" : "post";

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        New {noun}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Give it a title. You can write it next.
      </p>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={createPostAction} className="space-y-5">
        <input type="hidden" name="kind" value={kind} />
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder={
              kind === "decision"
                ? "e.g. Adopt one-big-table for product analytics"
                : "e.g. How we model incremental tables"
            }
            autoFocus
            required
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Create</Button>
          <Button type="button" variant="ghost" render={<Link href={basePath} />}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
