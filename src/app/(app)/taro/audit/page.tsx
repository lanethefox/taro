import { getAuditReport } from "@/db/queries/audit";
import { getSessionContext, isOwner } from "@/lib/auth";
import { AuditView } from "@/components/taro/audit-view";

export const metadata = { title: "Audit — Taro" };

export default async function AuditPage() {
  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  const report = await getAuditReport({ includePrivate: owner });
  return <AuditView report={report} owner={owner} />;
}
