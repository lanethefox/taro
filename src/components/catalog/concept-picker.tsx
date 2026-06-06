"use client";

import { Hash, type LucideIcon } from "lucide-react";

export type ConceptOption = { id: string; title: string };

/**
 * A multi-select chip picker over graph nodes. Defaults to the catalog
 * "Related concepts" use; pass `title`/`icon`/`emptyHint` to reuse it for other
 * link kinds (e.g. decisions / the "why").
 */
export function ConceptPicker({
  options,
  selected,
  onChange,
  title = "Related concepts",
  emptyHint = "No concept pages yet — create one in the wiki to link it here.",
  icon: Icon = Hash,
}: {
  options: ConceptOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  title?: string;
  emptyHint?: string;
  icon?: LucideIcon;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </p>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const on = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(o.id)}
                className={
                  "rounded-full border px-3 py-1 text-sm transition-colors " +
                  (on
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-card text-muted-foreground hover:bg-muted")
                }
              >
                {o.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
