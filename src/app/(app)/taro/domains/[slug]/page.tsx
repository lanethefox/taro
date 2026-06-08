import { notFound } from "next/navigation";

import { getDomainPanel } from "@/db/queries/domain-panel";
import { getSessionContext, isOwner } from "@/lib/auth";
import { DomainPanel } from "@/components/taro/domain-panel";

export const metadata = { title: "Arm — Taro" };

export default async function DomainPanelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getSessionContext();
  const panel = await getDomainPanel(slug, { includePrivate: isOwner(ctx) });
  if (!panel) notFound();
  return <DomainPanel panel={panel} />;
}
