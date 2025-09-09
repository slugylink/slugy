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

// Helper function to detect static generation context
async function isStaticGeneration(): Promise<boolean> {
  try {
    const headersList = await headers();
    // During static generation, some headers may not be available
    return !headersList.has('host');
  } catch {
    // If headers() fails, we're likely in static generation
    return true;
  }
}

// Helper function to get user session with better error handling
async function getUserSession() {
  // Skip authentication during static generation
  if (await isStaticGeneration()) {
    throw new Error("Authentication skipped during static generation");
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      throw new Error("No authenticated user found");
    }

    return session;
  } catch {
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
  } catch {
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
  } catch {
    // Silently handle cache errors
  }
}

export default async function BioLinks() {
  // Handle static generation case
  if (await isStaticGeneration()) {
    // During static generation, return a loading state or basic component
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-muted-foreground text-lg font-semibold">
            Loading Bio Links
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Please wait while we load your content...
          </p>
        </div>
      </div>
    );
  }

  try {
    const session = await getUserSession();
    const userId = session.user.id;

    let cachedBio: CacheResult | null = null;
    try {
      cachedBio = await getDefaultBioCache(userId);
    } catch {
      // Silently handle cache failures
    }

    if (cachedBio?.username) {
      return handleRedirect(cachedBio.username, 0);
    }

    const bioData = await fetchBioData(userId);

    handleCacheOperations(userId, bioData).catch(() => {
      // Silently handle cache failures
    });

    if (!bioData) {
      return <CreateBioGallery />;
    }

    return handleRedirect(bioData.username);
  } catch (error) {

    if (error instanceof Error) {
      if (error.message.includes("Authentication failed") || error.message.includes("Authentication skipped")) {
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
