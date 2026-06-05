import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Plus, Sparkles } from "lucide-react";

import {
  computeProgress,
  getCaseStudyBySlug,
  getTasks,
} from "@/db/queries/case-studies";
import type { CaseStudyTask } from "@/db/schema";
import { getSessionContext, isOwner } from "@/lib/auth";
import { addImprovementAction } from "@/app/(app)/case-studies/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CaseStudySettings } from "@/components/case-studies/case-study-settings";
import { ProgressRing, TileBar } from "@/components/case-studies/progress-ring";
import { TaskTile } from "@/components/case-studies/task-tile";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cs = await getCaseStudyBySlug(slug);
  return { title: cs?.name ?? "Case study" };
}

function Track({
  title,
  color,
  tasks,
  caseSlug,
  owner,
}: {
  title: string;
  color: string;
  tasks: CaseStudyTask[];
  caseSlug: string;
  owner: boolean;
}) {
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">
          {done}/{tasks.length}
        </span>
      </div>
      <TileBar done={done} total={tasks.length} color={color} className="mb-3" />
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskTile key={t.id} task={t} caseSlug={caseSlug} owner={owner} />
        ))}
      </div>
    </section>
  );
}

export default async function CaseStudyBoard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cs = await getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  if (!owner && cs.visibility === "private") notFound();

  const tasks = await getTasks(cs.id);
  const progress = computeProgress(tasks);
  const technical = tasks.filter((t) => t.kind === "baseline" && t.track === "technical");
  const business = tasks.filter((t) => t.kind === "baseline" && t.track === "business");
  const improvements = tasks.filter((t) => t.kind === "improvement");
  const complete = progress.overall.total > 0 && progress.overall.done === progress.overall.total;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href="/case-studies"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Case studies
      </Link>

      {/* Header */}
      <div className="tile mb-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <ProgressRing
          done={progress.overall.done}
          total={progress.overall.total}
          size={84}
          stroke={8}
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{cs.name}</h1>
          {cs.scenario ? (
            <p className="mt-1 text-sm text-muted-foreground">{cs.scenario}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {progress.overall.done} of {progress.overall.total} complete
            {complete ? " · baseline finished 🎉" : ""}
          </p>
        </div>
        {owner ? (
          <CaseStudySettings
            id={cs.id}
            initialName={cs.name}
            initialScenario={cs.scenario ?? ""}
            initialVisibility={cs.visibility}
          />
        ) : null}
      </div>

      {/* Tracks */}
      <div className="grid gap-8 md:grid-cols-2">
        <Track
          title="Technical track"
          color="var(--sage)"
          tasks={technical}
          caseSlug={cs.slug}
          owner={owner}
        />
        <Track
          title="Business & stakeholder track"
          color="var(--slate)"
          tasks={business}
          caseSlug={cs.slug}
          owner={owner}
        />
      </div>

      {/* Improvements */}
      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-wheat" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Room for improvement
          </h2>
        </div>

        {!complete ? (
          <div className="tile flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" />
            Finish the baseline ({progress.overall.total - progress.overall.done} to
            go) to unlock optimization opportunities.
          </div>
        ) : (
          <div className="space-y-3">
            {improvements.length > 0 ? (
              <div className="space-y-2">
                {improvements.map((t) => (
                  <TaskTile key={t.id} task={t} caseSlug={cs.slug} owner={owner} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Baseline complete. Now log where this build could go further —
                performance, cost, advanced modeling, tighter contracts.
              </p>
            )}

            {owner ? (
              <form
                action={addImprovementAction}
                className="tile flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
              >
                <input type="hidden" name="caseStudyId" value={cs.id} />
                <Input
                  name="title"
                  required
                  placeholder="e.g. Incrementalize fct_events to cut warehouse cost"
                  className="flex-1"
                />
                <Button type="submit">
                  <Plus className="size-4" />
                  Add improvement
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
