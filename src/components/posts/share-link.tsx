"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

/** Owner-facing public-share affordance for a published-public post. */
export function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/p/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.origin + path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
      <span className="font-medium text-emerald-700 dark:text-emerald-400">
        Public
      </span>
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        {path}
        <ExternalLink className="size-3" />
      </a>
      <button
        type="button"
        onClick={copy}
        className="ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
