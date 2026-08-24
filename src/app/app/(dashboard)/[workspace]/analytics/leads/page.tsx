import { LeadsAnalyticsClient } from "./leads-client";

interface LeadsPageProps {
  params: Promise<{
    workspace: string;
  }>;
}

export default async function LeadsAnalyticsPage({ params }: LeadsPageProps) {
  const { workspace } = await params;
  return <LeadsAnalyticsClient workspace={workspace} />;
}
