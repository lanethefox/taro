import Link from "next/link";
import { AlertTriangle, Code2, Shapes } from "lucide-react";

import type { SemanticGovernance as Data } from "@/db/queries/semantics";

function coverageColor(pct: number): string {
  if (pct >= 80) return "text-sage";
  if (pct >= 50) return "text-wheat";
  return "text-terracotta";
}

export function SemanticGovernance({ data }: { data: Data }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Shapes className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Semantics</h1>
          <p className="text-sm text-muted-foreground">
            Are the definitions actually wired to the warehouse — and defined once?
          </p>
        </div>
      </div>

      <section className="mb-8 grid grid-cols-3 gap-3">
        <div className="tile p-4">
          <div className={`text-2xl font-semibold tabular-nums ${coverageColor(data.coverage.pct)}`}>
            {data.coverage.pct}%
          </div>
          <div className="text-xs text-muted-foreground">
            catalog wired ({data.coverage.wired}/{data.coverage.total})
          </div>
        </div>
        <div className="tile p-4">
          <div className="text-2xl font-semibold tabular-nums">{data.concepts.length}</div>
          <div className="text-xs text-muted-foreground">concepts</div>
        </div>
        <div className="tile p-4">
          <div
            className={`text-2xl font-semibold tabular-nums ${data.orphans.length > 0 ? "text-wheat" : "text-sage"}`}
          >
            {data.orphans.length}
          </div>
          <div className="text-xs text-muted-foreground">defined, not wired</div>
        </div>
      </section>

      {data.duplicates.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-wheat">
            <AlertTriangle className="size-4" />
            Possible duplicate definitions
          </h2>
          <div className="space-y-2">
            {data.duplicates.map((g, i) => (
              <div key={i} className="tile p-3 text-sm">
                {g.members.map((m, j) => (
                  <span key={m.id}>
                    {j > 0 ? <span className="text-muted-foreground"> ≈ </span> : null}
                    <Link href={`/wiki/${m.slug}`} className="hover:underline">
                      {m.title}
                    </Link>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Concepts</h2>
        <div className="space-y-1.5">
          {data.concepts.map((c) => (
            <div key={c.id} className="tile flex items-center gap-3 p-3 text-sm">
              <Link href={`/wiki/${c.slug}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                {c.title}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">used by {c.usedBy}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                  c.catalogLinks > 0 ? "bg-sage/15 text-sage" : "bg-muted text-muted-foreground"
                }`}
              >
                {c.catalogLinks} catalog
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Link
          href="/api/context"
          className="tile flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Code2 className="size-4" />
          </span>
          <div>
            <div className="text-sm font-medium">Agent context bundle</div>
            <div className="text-xs text-muted-foreground">
              Machine-readable JSON — definitions, grain, structure, and now each
              node&apos;s arm, conformance, and cost, plus a platform governance
              summary.
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
