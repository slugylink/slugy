import CreateBioGallery from "@/components/web/_bio-links/create-bio-gallery";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getDefaultBioCache,
  setDefaultBioCache,
} from "@/lib/cache-utils/bio-cache";

const REDIRECT_DELAY = 100; // ms delay for redirects

interface BioData {
  username: string;
  userId: string;
}

interface CacheResult {
  username: string;
  userId: string;
}

// Helper function to get user session with better error handling
async function getUserSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      throw new Error("No authenticated user found");
    }

    return session;
  } catch (error) {
    console.error("Failed to get user session:", error);
    throw new Error("Authentication failed");
  }
}

// Helper function to fetch bio data with better error handling
async function fetchBioData(userId: string): Promise<BioData | null> {
  try {
    const bio = await db.bio.findFirst({
      where: {
        userId,
        isDefault: true,
      },
      select: {
        username: true,
      },
    });

    if (!bio?.username) {
      return null;
    }

    return {
      username: bio.username,
      userId,
    };
  } catch (error) {
    console.error("Failed to fetch bio data:", error);
    throw new Error("Failed to fetch bio data from database");
  }
}

// Helper function to handle redirects with better performance
async function handleRedirect(
  username: string,
  delay: number = REDIRECT_DELAY,
) {
  // Small delay to allow for better UX and prevent flash
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return redirect(`/bio-links/${username}`);
}

// Helper function to handle cache operations with better error handling
async function handleCacheOperations(userId: string, bioData: BioData | null) {
  try {
    if (bioData) {
      // Cache successful result
      await setDefaultBioCache(userId, bioData);
    } else {
      // Cache null result to avoid repeated DB queries
      await setDefaultBioCache(userId, null);
    }
  } catch (error) {
    // Log cache errors but don't fail the request
    console.warn("Failed to update cache:", error);
  }
}

export default async function BioLinks() {
  try {
    const session = await getUserSession();
    const userId = session.user.id;

    let cachedBio: CacheResult | null = null;
    try {
      cachedBio = await getDefaultBioCache(userId);
    } catch (error) {
      console.warn("Cache read failed, falling back to database:", error);
    }

    if (cachedBio?.username) {
      return handleRedirect(cachedBio.username, 0);
    }

    const bioData = await fetchBioData(userId);

    handleCacheOperations(userId, bioData).catch(console.warn);

    if (!bioData) {
      return <CreateBioGallery />;
    }

    return handleRedirect(bioData.username);
  } catch (error) {
    console.error("BioLinks page error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Authentication failed")) {
        return redirect("/login");
      }
      if (error.message.includes("Failed to fetch bio data")) {
        return (
          <div className="flex min-h-[60vh] w-full flex-col items-center justify-center">
            <div className="text-center">
              <h2 className="text-destructive text-lg font-semibold">
                Failed to load bio links
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                There was an error loading your bio links. Please try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        );
      }
    }

    return redirect("/login");
  }
}
