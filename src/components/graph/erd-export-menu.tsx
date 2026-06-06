"use client";

import { Download } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const FORMATS = [
  { key: "dbml", label: "DBML" },
  { key: "sql", label: "SQL DDL" },
  { key: "dbt", label: "dbt schema.yml" },
] as const;

/**
 * Export the current diagram. Each item is a plain link to the export route,
 * which streams the serialized text as a download. PNG/SVG are intentionally
 * out of scope for this slice (would need an extra rendering dependency).
 */
export function ErdExportMenu({ diagramId }: { diagramId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Download className="size-4" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Download as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FORMATS.map((f) => (
          <DropdownMenuItem
            key={f.key}
            render={
              <a
                href={`/api/export/erd/${diagramId}?format=${f.key}`}
                download
              />
            }
          >
            {f.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
