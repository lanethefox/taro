import { notFound } from "next/navigation";
import { Terminal } from "lucide-react";

import { getSessionContext, isOwner } from "@/lib/auth";
import { QueryEditor } from "@/components/query/query-editor";

export const metadata = { title: "Query" };

export default async function QueryPage() {
  const ctx = await getSessionContext();
  if (!isOwner(ctx)) notFound();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b px-6 py-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Terminal className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Query</h1>
          <p className="text-sm text-muted-foreground">
            Run read-only SQL or GraphQL against the warehouse — owner only.
          </p>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <QueryEditor />
      </div>
    </div>
  );
}
