import { KeyRound, Link2 } from "lucide-react";

import type { ColumnRow } from "@/db/queries/catalog";

/** Read-only columns grid for a model or source detail view. */
export function ColumnsTable({ columns }: { columns: ColumnRow[] }) {
  if (columns.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No columns documented yet.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
            <th className="px-3 py-2">Column</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Tests</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((c) => (
            <tr key={c.id} className="border-b last:border-b-0 align-top">
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5 font-mono">
                  {c.name}
                  {c.isPk ? (
                    <KeyRound
                      className="size-3 text-amber-600 dark:text-amber-400"
                      aria-label="primary key"
                    />
                  ) : null}
                  {c.isFk ? (
                    <Link2
                      className="size-3 text-sky-600 dark:text-sky-400"
                      aria-label="foreign key"
                    />
                  ) : null}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-muted-foreground">
                {c.dataType ?? "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {c.description ?? ""}
              </td>
              <td className="px-3 py-2">
                {c.tests.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {c.tests.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
