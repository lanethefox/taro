import Link from "next/link";
import { Plus } from "lucide-react";

import { listPagesForTree } from "@/db/queries/pages";
import { listCaseStudiesWithProgress } from "@/db/queries/case-studies";
import { getSessionContext, isOwner } from "@/lib/auth";
import { buildSkillTree, computeHud, layoutTree } from "@/lib/skill-tree";
import { Button } from "@/components/ui/button";
import { SkillTree } from "@/components/wiki/skill-tree";

export default async function WikiIndexPage() {
  const [pages, ctx, caseStudies] = await Promise.all([
    listPagesForTree(),
    getSessionContext(),
    listCaseStudiesWithProgress(),
  ]);
  const owner = isOwner(ctx);
  const visible = owner ? pages : pages.filter((p) => p.visibility !== "private");

  if (visible.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No pages yet.
            {owner ? " Create your first one to grow the tree." : ""}
          </p>
          {owner ? (
            <Button className="mt-4" render={<Link href="/wiki/new" />}>
              <Plus className="size-4" />
              New page
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const roots = buildSkillTree(
    visible.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      kind: p.kind,
      parentId: p.parentId,
      text: p.text,
    })),
  );
  const layout = layoutTree(roots);

  const pagesWritten = layout.nodes.filter((n) => n.state === "mastered").length;
  const seedlings = layout.nodes.filter((n) => n.state === "seedling").length;

  const csVisible = owner
    ? caseStudies
    : caseStudies.filter((c) => c.visibility !== "private");
  const tasksDone = csVisible.reduce((a, c) => a + c.done, 0);
  const tasksTotal = csVisible.reduce((a, c) => a + c.total, 0);

  const hud = computeHud({
    tasksDone,
    tasksTotal,
    pagesWritten,
    pagesTotal: layout.nodes.length,
    seedlings,
  });

  const initial =
    (ctx?.profile.displayName ?? "").trim().charAt(0).toUpperCase() || "?";

  return (
    <SkillTree
      layout={layout}
      hud={hud}
      ownerInitial={initial}
      canCreate={owner}
    />
  );
}
