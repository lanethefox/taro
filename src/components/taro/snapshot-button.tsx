"use client";

import { useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { snapshotConformanceAction } from "@/app/(app)/taro/actions";
import { Button } from "@/components/ui/button";

export function SnapshotButton() {
  const [pending, start] = useTransition();
  function run() {
    start(async () => {
      const res = await snapshotConformanceAction();
      if (res.ok) toast.success("Conformance snapshot saved");
      else toast.error(res.error);
    });
  }
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={run}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
      Snapshot
    </Button>
  );
}
