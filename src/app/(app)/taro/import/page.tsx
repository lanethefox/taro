import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";

import { requireOwner } from "@/lib/auth";
import { ImportForm } from "@/components/taro/import-form";

export const metadata = { title: "Import dbt artifacts" };

export default async function ImportPage() {
  await requireOwner();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/taro"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Control center
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Upload className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import dbt artifacts
          </h1>
          <p className="text-sm text-muted-foreground">
            Drop a dbt run&apos;s JSON to sync the catalog. Upsert is keyed by dbt
            <code className="mx-1 rounded bg-muted px-1 text-xs">unique_id</code>
            and falls back to matching by name, so re-importing updates in place.
          </p>
        </div>
      </div>

      <ImportForm />
    </div>
  );
}
