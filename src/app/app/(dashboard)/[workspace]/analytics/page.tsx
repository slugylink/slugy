import { AnalyticsClient } from "./analytics-client";

interface WorkspaceLayoutProps {
  params: Promise<{
    workspace: string;
  }>;
}

export default async function Analytics({
  params,
}: WorkspaceLayoutProps) {
  const awaitedParams = await params;
  
  return <AnalyticsClient workspace={awaitedParams.workspace} />;
}
