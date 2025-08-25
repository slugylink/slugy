import { getUsages } from "@/server/actions/usages/get-usages";
import { UsageStatsClient } from "./usage-stats-client";

export default async function UsageStats({
  workspaceslug,
}: {
  workspaceslug: string;
}) {
  const { workspace, usage } = await getUsages({ workspaceslug });
  return <UsageStatsClient workspace={workspace} usage={usage} />;
}
