import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  ShieldAlert,
  Wrench,
  XCircle,
} from "lucide-react";

import type { ModelInspection } from "@/db/queries/inspect";

const kindLabel: Record<string, string> = {
  extract: "Extract",
  replace: "Reuse",
  split: "Split",
  rename: "Rename",
  enumerate: "Enumerate",
  flatten: "Flatten",
};

export function ModelInspector({ inspection }: { inspection: ModelInspection }) {
  const { plan } = inspection;
  const flagged = plan?.verdict === "needs_review";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/taro/audit"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Audit
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FlaskConical className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{inspection.name}</h1>
          <p className="text-sm text-muted-foreground">
            Decomposition advisor
            {inspection.layer ? ` · ${inspection.layer}` : ""}
            {inspection.domainName ? ` · ${inspection.domainName}` : ""}
          </p>
        </div>
      </div>

      {!inspection.sql ? (
        <div className="tile p-6 text-sm text-muted-foreground">
          No SQL captured for this model yet.
        </div>
      ) : (
        <>
          {plan ? (
            <div
              className={`tile mb-6 flex items-start gap-3 p-5 ${
                flagged ? "border-wheat/50" : "border-sage/50"
              }`}
            >
              <span className={flagged ? "text-wheat" : "text-sage"}>
                {flagged ? <ShieldAlert className="size-5" /> : <CheckCircle2 className="size-5" />}
              </span>
              <div>
                <div className="font-medium">
                  {flagged ? "Flagged for manual review" : "Decomposable"}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {plan.confidence}% confidence
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.reason}</p>
              </div>
            </div>
          ) : (
            <div className="tile mb-6 flex items-center gap-3 p-5 border-sage/50">
              <CheckCircle2 className="size-5 text-sage" />
              <div className="text-sm">No anti-patterns detected — this model conforms.</div>
            </div>
          )}

          <section className="mb-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Detected issues <span className="tabular-nums">({inspection.issues.length})</span>
              </h2>
              <div className="space-y-2">
                {inspection.issues.map((i, idx) => (
                  <div key={idx} className="tile p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {i.severity === "error" ? (
                        <XCircle className="size-4 text-terracotta" />
                      ) : (
                        <AlertTriangle className="size-4 text-wheat" />
                      )}
                      {i.title}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p>
                    {i.evidence ? (
                      <code className="mt-1 block truncate text-xs text-muted-foreground/80">
                        {i.evidence}
                      </code>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wrench className="size-4" />
                Rebuild plan
              </h2>
              <div className="space-y-2">
                {plan && plan.recommendations.length > 0 ? (
                  plan.recommendations.map((r, idx) => (
                    <div key={idx} className="tile p-3">
                      <div className="text-sm font-medium">
                        <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                          {kindLabel[r.kind] ?? r.kind}
                        </span>
                        {r.title}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="tile p-3 text-sm text-muted-foreground">Nothing to change.</div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">SQL</h2>
            <pre className="tile overflow-x-auto p-4 text-xs leading-relaxed text-foreground/90">
              <code>{inspection.sql}</code>
            </pre>
          </section>
        </>
      )}
    </div>
  );
}
