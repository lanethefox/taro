import Link from "next/link";

import { createModelAction, createSourceAction } from "@/app/(app)/catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewCatalogForm({
  kind,
  error,
}: {
  kind: "model" | "source";
  error?: string;
}) {
  const action = kind === "model" ? createModelAction : createSourceAction;

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        New {kind}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Name it. You can fill in columns and metadata next.
      </p>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={action} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder={
              kind === "model" ? "e.g. stg_orders" : "e.g. stripe.charges"
            }
            className="font-mono"
            autoFocus
            required
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Create</Button>
          <Button type="button" variant="ghost" render={<Link href="/catalog" />}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
