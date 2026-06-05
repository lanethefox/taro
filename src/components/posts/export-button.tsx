"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Copy a post's content as Markdown / plain text for LinkedIn (SPEC §4.2). */
export function ExportButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(format: "markdown" | "text") {
    try {
      const res = await fetch(
        `/api/export/post/${postId}${format === "text" ? "?format=text" : ""}`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.text();
      await navigator.clipboard.writeText(body);
      setCopied(true);
      toast.success(`Copied as ${format}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
            Export
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={() => copy("markdown")}>
          <Copy className="size-4" />
          Copy as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => copy("text")}>
          <Copy className="size-4" />
          Copy as plain text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
