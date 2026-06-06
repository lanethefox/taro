import { NextResponse } from "next/server";

import { getContextBundle } from "@/db/queries/context";
import { getSessionContext, isOwner } from "@/lib/auth";

/**
 * Machine-readable context bundle: concept definitions + catalog grain/structure
 * + relationships as JSON, for agent/LLM consumption. Auth-gated; visibility
 * filtered (owner sees all; others never see private).
 */
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bundle = await getContextBundle(isOwner(ctx));
  return NextResponse.json(bundle, {
    headers: {
      "Content-Disposition": 'inline; filename="taro-context.json"',
      "Cache-Control": "no-store",
    },
  });
}
