import Link from "next/link";

import { createPageAction } from "@/app/(app)/wiki/actions";
import { listPages } from "@/db/queries/pages";
import { requireOwner } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "New page" };

export default async function NewPagePage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string; error?: string }>;
}) {
  await requireOwner();
  const { parent, error } = await searchParams;
  const pages = await listPages();

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">New page</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Give it a title. You can write and link it next.
      </p>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={createPageAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="e.g. Dimensional modeling" autoFocus required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kind">Type</Label>
          <select
            id="kind"
            name="kind"
            defaultValue="wiki"
            className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm"
          >
            <option value="wiki">Wiki page</option>
            <option value="concept">Concept (strategy library)</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="parentId">Parent page (optional)</Label>
          <select
            id="parentId"
            name="parentId"
            defaultValue={parent ?? ""}
            className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-sm"
          >
            <option value="">None (top level)</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Button type="submit">Create page</Button>
          <Button type="button" variant="ghost" render={<Link href="/wiki" />}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
