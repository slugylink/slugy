import { importCampaignCosts } from "@/lib/campaigns/costs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceslug: string; id: string }> },
) {
  const { workspaceslug, id } = await params;
  return importCampaignCosts(request, id, workspaceslug);
}
