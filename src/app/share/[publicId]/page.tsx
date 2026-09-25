import type { Metadata } from "next";
import { db } from "@/server/db";
import ReportClient from "./report-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  try {
    const shared = await db.sharedAnalytics.findFirst({
      where: { publicId, isPublic: true, deletedAt: null },
      include: {
        link: {
          select: {
            slug: true,
            workspace: { select: { name: true } },
          },
        },
      },
    });
    const title = shared?.link
      ? `${shared.link.slug} — Analytics Report`
      : "Analytics Report";
    const robots =
      shared?.isPublic && shared.allowIndexing
        ? { index: true, follow: true }
        : { index: false, follow: false };
    return {
      title,
      description: shared?.link
        ? `Analytics report for ${shared.link.slug} by ${shared.link.workspace.name}, powered by Slugy.`
        : "Shared analytics report powered by Slugy.",
      robots,
    };
  } catch {
    return { title: "Analytics Report", robots: { index: false } };
  }
}

export default async function ShareReportPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <ReportClient publicId={publicId} />;
}
