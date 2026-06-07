import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  getCaseStudyBySlug,
  getTaskBySlug,
} from "@/db/queries/case-studies";
import { listPages } from "@/db/queries/pages";
import { getSessionContext, isOwner } from "@/lib/auth";
import type { JSONContent } from "@/lib/content";
import { ContentView } from "@/components/editor/content-view";
import { TaskWorkspace } from "@/components/case-studies/task-workspace";

const statusLabel: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; taskSlug: string }>;
}) {
  const { slug, taskSlug } = await params;
  const cs = await getCaseStudyBySlug(slug);
  const task = cs ? await getTaskBySlug(cs.id, taskSlug) : undefined;
  return { title: task ? `${task.title} · ${cs?.name}` : "Task" };
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ slug: string; taskSlug: string }>;
}) {
  const { slug, taskSlug } = await params;
  const cs = await getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  if (!owner && cs.visibility === "private") notFound();
  const themed = cs.slug === "classdojo";

  const task = await getTaskBySlug(cs.id, taskSlug);
  if (!task) notFound();

  // Wikilink resolution map (concepts + pages).
  const allPages = await listPages();
  const visiblePages = owner
    ? allPages
    : allPages.filter((p) => p.visibility !== "private");
  const linkMap: Record<string, string> = {};
  for (const p of visiblePages) linkMap[p.title.toLowerCase()] = p.slug;

  if (owner) {
    return (
      <div className={themed ? "theme-classdojo min-h-full bg-background" : undefined}>
        <div className="mx-auto max-w-3xl px-6 pt-6">
          <Link
            href={`/case-studies/${cs.slug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {cs.name}
          </Link>
        </div>
        <TaskWorkspace
          id={task.id}
          caseSlug={cs.slug}
          category={task.category}
          initialTitle={task.title}
          initialContent={task.content as JSONContent | null}
          initialStatus={task.status}
          linkMap={linkMap}
        />
      </div>
    );
  }

  // Read-only (viewer)
  return (
    <div className={themed ? "theme-classdojo min-h-full bg-background" : undefined}>
    <article className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/case-studies/${cs.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {cs.name}
      </Link>
      {task.category ? (
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {task.category}
        </span>
      ) : null}
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {statusLabel[task.status]}
        </span>
      </div>
      <ContentView content={task.content as JSONContent | null} linkMap={linkMap} />
    </article>
    </div>
  );
}
