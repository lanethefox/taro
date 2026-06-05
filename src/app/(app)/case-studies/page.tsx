import Link from "next/link";
import { Compass, Plus } from "lucide-react";

import { listCaseStudiesWithProgress } from "@/db/queries/case-studies";
import { getSessionContext, isOwner } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProgressRing, TileBar } from "@/components/case-studies/progress-ring";

export const metadata = { title: "Case studies" };

export default async function CaseStudiesPage() {
  const [studies, ctx] = await Promise.all([
    listCaseStudiesWithProgress(),
    getSessionContext(),
  ]);
  const owner = isOwner(ctx);
  const visible = owner
    ? studies
    : studies.filter((s) => s.visibility !== "private");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Compass className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Case studies</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Where the theory gets built. Each case study is a complete,
              end-to-end analytics scenario — work the checklist, fill in the
              map, leave no gaps.
            </p>
          </div>
        </div>
        {owner ? (
          <Button render={<Link href="/case-studies/new" />}>
            <Plus className="size-4" />
            New case study
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="tile flex flex-col items-center gap-3 p-12 text-center">
          <Compass className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No case studies yet.
            {owner ? " Create one — ClassDojo is a great first scenario." : ""}
          </p>
          {owner ? (
            <Button render={<Link href="/case-studies/new" />}>
              <Plus className="size-4" />
              New case study
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((s) => (
            <Link
              key={s.id}
              href={`/case-studies/${s.slug}`}
              className="tile tile-interactive flex gap-4 p-5"
            >
              <ProgressRing done={s.done} total={s.total} size={64} stroke={7} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.name}</p>
                {s.scenario ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {s.scenario}
                  </p>
                ) : null}
                <div className="mt-3">
                  <TileBar done={s.done} total={s.total} />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {s.done}/{s.total} complete
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
