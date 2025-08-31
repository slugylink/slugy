import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";

//* Update link
export async function PUT(
  req: Request,
  context: { params: Promise<{ username: string; linkId: string }> },
) {
  const params = await context.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gallery = await db.bio.findFirst({
    where: {
      userId: session.user.id,
      username: params.username,
    },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const link = await db.bioLinks.findFirst({
    where: {
      id: params.linkId,
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const { title, url } = (await req.json()) as { title: string; url: string };

  await db.bioLinks.update({
    where: { id: params.linkId },
    data: { title, url },
  });

  // Invalidate both caches: public gallery + admin dashboard
  await Promise.all([
    invalidateBioCache.links(params.username),           // Public cache
    invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
  ]);

  return NextResponse.json({ message: "Link updated successfully" });
}

//* Delete link
export async function DELETE(
  req: Request,
  context: { params: Promise<{ username: string; linkId: string }> },
) {
  const params = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gallery = await db.bio.findFirst({
    where: {
      userId: session.user.id,
      username: params.username,
    },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const linkId = params.linkId;

  await db.bioLinks.delete({
    where: {
      id: linkId,
    },
  });

  // Invalidate both caches: public gallery + admin dashboard
  await Promise.all([
    invalidateBioCache.links(params.username),           // Public cache
    invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
  ]);

  return NextResponse.json({
    message: "Link deleted successfully",
  });
}

// * update isPublic status
export async function PATCH(
  req: Request,
  context: { params: Promise<{ username: string; linkId: string }> },
) {
  const params = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { isPublic } = (await req.json()) as { isPublic: boolean };

  await db.bioLinks.update({
    where: { id: params.linkId },
    data: { isPublic },
  });

  // Invalidate both caches: public gallery + admin dashboard
  await Promise.all([
    invalidateBioCache.links(params.username),           // Public cache
    invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
  ]);

  return NextResponse.json({ message: "Link updated successfully" });
}
