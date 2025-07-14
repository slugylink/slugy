import CreateBioGallery from "@/components/web/_bio-links/create-bio-gallery";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function BioLinks() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return redirect("/login");
  }

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
    return <CreateBioGallery />;
  }
  return redirect(`/bio-links/${bio?.username}`);
}
