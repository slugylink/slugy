import CreateBioGallery from "@/components/web/_bio-links/create-bio-gallery";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDefaultBioCache, setDefaultBioCache } from "@/lib/cache-utils/bio-cache";

export default async function BioLinks() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return redirect("/login");
  }

  // Try to get from cache first
  const cachedBio = await getDefaultBioCache(session.user.id);
  if (cachedBio) {
    return redirect(`/bio-links/${cachedBio.username}`);
  }

  // Cache miss: fetch from database
  const bio = await db.bio.findFirst({
    where: {
      userId: session.user.id,
      isDefault: true,
    },
    select: {
      username: true,
    },
  });

  if (!bio) {
    // Cache null result to avoid repeated DB queries
    await setDefaultBioCache(session.user.id, null);
    return <CreateBioGallery />;
  }

  // Cache the result
  await setDefaultBioCache(session.user.id, {
    username: bio.username,
    userId: session.user.id,
  });

  return redirect(`/bio-links/${bio.username}`);
}
