"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { applyImport, type ImportSummary } from "@/db/queries/ingest";
import { parseDbtArtifacts, type ParsedImport } from "@/lib/ingest/dbt";
import { requireOwner } from "@/lib/auth";

const payloadSchema = z.object({
  manifest: z.string().min(2, "manifest.json is required"),
  catalog: z.string().optional(),
  runResults: z.string().optional(),
  dryRun: z.boolean().default(false),
});

export type ImportActionResult =
  | { ok: true; dryRun: boolean; summary: ImportSummary; stats: ParsedImport["stats"] }
  | { ok: false; error: string };

function parseJson(label: string, raw?: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export async function importDbtAction(
  input: z.infer<typeof payloadSchema>,
): Promise<ImportActionResult> {
  const ctx = await requireOwner();
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const artifacts = {
      manifest: parseJson("manifest.json", parsed.data.manifest),
      catalog: parseJson("catalog.json", parsed.data.catalog),
      runResults: parseJson("run_results.json", parsed.data.runResults),
    };
    const result = parseDbtArtifacts(artifacts);
    if (result.models.length === 0 && result.sources.length === 0) {
      return {
        ok: false,
        error: "No models or sources found — is this a dbt manifest.json?",
      };
    }

    const summary = await applyImport(result, {
      importerId: ctx.user.id,
      dryRun: parsed.data.dryRun,
    });

    if (!parsed.data.dryRun) {
      revalidatePath("/taro");
      revalidatePath("/catalog");
    }
    return { ok: true, dryRun: parsed.data.dryRun, summary, stats: result.stats };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}
