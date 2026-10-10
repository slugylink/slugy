import { CampaignsClient } from "@/components/web/campaigns/campaigns-client";
export default async function Page({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  return <CampaignsClient workspace={(await params).workspace} />;
}
