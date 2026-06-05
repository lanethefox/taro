"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";

import { setTaskStatusAction } from "@/app/(app)/case-studies/actions";
import type { CaseStudyTask } from "@/db/schema";
import { cn } from "@/lib/utils";

export function TaskTile({
  task,
  caseSlug,
  owner,
}: {
  task: Pick<
    CaseStudyTask,
    "id" | "slug" | "title" | "category" | "status" | "description"
  >;
  caseSlug: string;
  owner: boolean;
}) {
  const [pending, start] = useTransition();
  const done = task.status === "done";

  function toggle() {
    if (!owner) return;
    start(async () => {
      await setTaskStatusAction(task.id, done ? "todo" : "done");
    });
  }

  return (
    <div
      className={cn(
        "tile tile-interactive group flex items-start gap-3 p-3",
        done && "tile-done",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={!owner || pending}
        aria-pressed={done}
        aria-label={done ? "Mark not done" : "Mark done"}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          done
            ? "border-transparent bg-sage text-white"
            : "border-border bg-card hover:border-sage",
          !owner && "cursor-default opacity-70",
        )}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : done ? (
          <Check className="size-3.5" />
        ) : null}
      </button>

      <Link href={`/case-studies/${caseSlug}/${task.slug}`} className="min-w-0 flex-1">
        {task.category ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {task.category}
          </span>
        ) : null}
        <p className={cn("font-medium leading-snug", done && "text-muted-foreground")}>
          {task.title}
        </p>
        {task.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {task.description}
          </p>
        ) : null}
      </Link>
    </div>
  );
}
