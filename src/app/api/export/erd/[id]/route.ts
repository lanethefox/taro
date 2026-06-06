import { NextResponse } from "next/server";

import { getDiagramData } from "@/db/queries/erd";
import { getSessionContext, isOwner } from "@/lib/auth";
import {
  ERD_EXPORT_META,
  serializeErd,
  type ErdExportFormat,
  type ExportInput,
} from "@/lib/graph/erd-export";

/**
 * Export an ERD as DBML / SQL DDL / dbt `schema.yml` (`?format=dbml|sql|dbt`).
 * Auth-gated: the owner can export any diagram; others only non-private ones.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = (new URL(request.url).searchParams.get("format") ??
    "dbml") as ErdExportFormat;
  if (!(format in ERD_EXPORT_META)) {
    return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  }

  const data = await getDiagramData(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isOwner(ctx) && data.diagram.visibility === "private") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const input: ExportInput = {
    diagramName: data.diagram.name,
    models: data.models.map((m) => ({
      name: m.name,
      description: null,
      columns: m.columns.map((c) => ({
        name: c.name,
        dataType: c.dataType,
        description: c.description,
        isPk: c.isPk,
        isFk: c.isFk,
        tests: c.tests,
      })),
    })),
    relationships: data.relationships.map((r) => ({
      fromModelName: r.fromModelName,
      fromColumnName: r.fromColumnName,
      toModelName: r.toModelName,
      toColumnName: r.toColumnName,
      cardinality: r.cardinality,
    })),
  };

  const meta = ERD_EXPORT_META[format];
  const body = serializeErd(format, input);
  const slug = data.diagram.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")
    .toLowerCase() || "diagram";

  return new NextResponse(body, {
    headers: {
      "Content-Type": meta.contentType,
      "Content-Disposition": `attachment; filename="${slug}.${meta.ext}"`,
    },
  });
}
