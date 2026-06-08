import { listRemediations } from "@/db/queries/remediation";
import { getSessionContext, isOwner } from "@/lib/auth";
import { RemediationBoard } from "@/components/taro/remediation-board";

export const metadata = { title: "Remediation — Taro" };

export default async function RemediationPage() {
  const ctx = await getSessionContext();
  const owner = isOwner(ctx);
  const items = await listRemediations();
  return <RemediationBoard items={items} owner={owner} />;
}
