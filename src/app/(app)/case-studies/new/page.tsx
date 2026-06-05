import Link from "next/link";

import { createCaseStudyAction } from "@/app/(app)/case-studies/actions";
import { requireOwner } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "New case study" };

export default async function NewCaseStudyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOwner();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">New case study</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        It starts pre-loaded with the full technical + business curriculum — a
        complete, gap-free checklist you work through.
      </p>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form action={createCaseStudyAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="e.g. ClassDojo" autoFocus required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scenario">Scenario (optional)</Label>
          <textarea
            id="scenario"
            name="scenario"
            className="min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            placeholder="An ed-tech product: students, teachers, classrooms, points & behaviors, parent engagement. Describe the company and its data landscape…"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Create &amp; seed curriculum</Button>
          <Button type="button" variant="ghost" render={<Link href="/case-studies" />}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
