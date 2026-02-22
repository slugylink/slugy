import CreateBioGallery from "@/components/web/_bio-links/create-bio-gallery";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getDefaultBioCache,
  setDefaultBioCache,
} from "@/lib/cache-utils/bio-cache";

// ============================================================================
// Types
// ============================================================================

interface BioData {
  username: string;
  userId: string;
}

interface CacheResult {
  username: string;
  userId: string;
}

// ============================================================================
// Constants
// ============================================================================

const REDIRECT_DELAY_MS = 100;

const ERROR_MESSAGES = {
  AUTH_SKIPPED: "Authentication skipped during static generation",
  AUTH_FAILED: "Authentication failed",
  NO_USER: "No authenticated user found",
  FETCH_FAILED: "Failed to fetch bio data from database",
} as const;

// ============================================================================
// Utilities
// ============================================================================

async function isStaticGeneration(): Promise<boolean> {
  try {
    const headersList = await headers();
    return !headersList.has("host");
  } catch {
    return true;
  }
}

async function delay(ms: number): Promise<void> {
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getUserSession() {
  if (await isStaticGeneration()) {
    throw new Error(ERROR_MESSAGES.AUTH_SKIPPED);
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      throw new Error(ERROR_MESSAGES.NO_USER);
    }

    return session;
  } catch {
    throw new Error(ERROR_MESSAGES.AUTH_FAILED);
  }
}

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
    throw new Error(ERROR_MESSAGES.FETCH_FAILED);
  }
}

// ============================================================================
// Cache Operations
// ============================================================================

async function getCachedBio(userId: string): Promise<CacheResult | null> {
  try {
    return await getDefaultBioCache(userId);
  } catch {
    // Silently handle cache read failures
    return null;
  }
}

async function isValidCachedBio(
  userId: string,
  username: string,
): Promise<boolean> {
  try {
    const bio = await db.bio.findFirst({
      where: {
        userId,
        username,
      },
      select: {
        username: true,
      },
    });

    return Boolean(bio?.username);
  } catch {
    return false;
  }
}

async function updateBioCache(
  userId: string,
  bioData: BioData | null,
): Promise<void> {
  try {
    await setDefaultBioCache(userId, bioData);
  } catch {
    // Silently handle cache write failures
  }
}

// ============================================================================
// Redirect Helpers
// ============================================================================

async function redirectToBio(
  username: string,
  delayMs: number = REDIRECT_DELAY_MS,
) {
  await delay(delayMs);
  return redirect(`/bio-links/${username}`);
}

function redirectToLogin() {
  return redirect("/login");
}

// ============================================================================
// UI Components
// ============================================================================

function LoadingState() {
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

function ErrorState() {
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

// ============================================================================
// Error Handling
// ============================================================================

function isAuthError(error: Error): boolean {
  return (
    error.message.includes("Authentication failed") ||
    error.message.includes("Authentication skipped")
  );
}

function isFetchError(error: Error): boolean {
  return error.message.includes("Failed to fetch bio data");
}

// ============================================================================
// Main Component
// ============================================================================

export default async function BioLinks() {
  // Handle static generation
  if (await isStaticGeneration()) {
    return <LoadingState />;
  }

  try {
    // Get authenticated user
    const session = await getUserSession();
    const userId = session.user.id;

    // Check cache first
    const cachedBio = await getCachedBio(userId);
    if (cachedBio?.username) {
      const cacheIsValid = await isValidCachedBio(userId, cachedBio.username);
      if (cacheIsValid) {
        return redirectToBio(cachedBio.username, 0);
      }

      updateBioCache(userId, null).catch(() => {
        // Silently handle cache failures
      });
    }

    // Fetch from database
    const bioData = await fetchBioData(userId);

    // Update cache (fire and forget)
    updateBioCache(userId, bioData).catch(() => {
      // Silently handle cache failures
    });

    // Handle result
    if (!bioData) {
      return <CreateBioGallery />;
    }

    return redirectToBio(bioData.username);
  } catch (error) {
    if (error instanceof Error) {
      if (isAuthError(error)) {
        return redirectToLogin();
      }
      if (isFetchError(error)) {
        return <ErrorState />;
      }
    }

    return redirectToLogin();
  }
}
