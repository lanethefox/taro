import type { LucideIcon } from "lucide-react";

/**
 * Placeholder for surfaces that land in a later milestone. The app shell, auth,
 * schema, and RLS are real in M0; these pages get filled in M1–M3.
 */
export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
  milestone,
  capabilities,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  milestone: string;
  capabilities: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="mb-3 inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Arrives in {milestone}
        </div>
        <ul className="space-y-2 text-sm">
          {capabilities.map((c) => (
            <li key={c} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
              <span className="text-muted-foreground">{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
