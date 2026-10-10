import { importCampaignCosts } from "@/lib/campaigns/costs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return importCampaignCosts(request, (await params).id);
}
