"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createAuthClient } from "better-auth/react";
import { FaGithub } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import NumberFlow from "@number-flow/react";
import { useState, useCallback, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type GetStartedButtonProps = {
  isGitVisible?: boolean;
  className?: string;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
const { useSession } = createAuthClient();

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useGitHubStars(repo: string) {
  const { data, error } = useSWR<{ stargazers_count: number }>(
    `https://api.github.com/repos/${repo}`,
    fetcher,
    {
      dedupingInterval: 3_600_000, // 1 hour
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      fallbackData: { stargazers_count: 0 },
    },
  );
  return {
    stars: data?.stargazers_count ?? 0,
    isLoading: !error && !data,
  };
}

function useAppUrl() {
  const base =
    process.env.NODE_ENV === "production"
      ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
      : "http://app.localhost:3000";
  return base;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GetStartedButton({
  isGitVisible = true,
  className,
}: GetStartedButtonProps) {
  const { data: session } = useSession();
  const { stars, isLoading } = useGitHubStars("slugylink/slugy");
  const [navigating, setNavigating] = useState(false);

  const appUrl = useAppUrl();
  const destination = session ? appUrl : `${appUrl}/login`;

  // Warm up on mount + session change
  useEffect(() => {
    fetch(destination, { method: "GET", mode: "no-cors" }).catch(() => {});
  }, [destination]);

  const prefetch = useCallback(() => {
    fetch(destination, { method: "GET", mode: "no-cors" }).catch(() => {});
  }, [destination]);

  return (
    <>
      <link rel="preconnect" href={appUrl} />
      <link rel="prefetch" href={destination} />

      <div className={cn("flex gap-2", className)}>
        {isGitVisible && (
          <Link
            href="https://github.com/slugylink/slugy"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Slugy on GitHub"
          >
            <Button variant="ghost">
              <FaGithub className="h-5 w-5" />
              <NumberFlow
                value={isLoading ? 0 : stars}
                format={{ notation: "compact", maximumFractionDigits: 1 }}
                className="text-xs"
              />
            </Button>
          </Link>
        )}

        {/* <a> instead of <Link> — cross-origin navigation to app subdomain */}
        <a
          href={destination}
          onMouseEnter={prefetch}
          onTouchStart={prefetch}
          onClick={() => setNavigating(true)}
        >
          <Button
            variant="default"
            disabled={navigating}
            className="w-full sm:w-fit"
          >
            Get started
          </Button>
        </a>
      </div>
    </>
  );
}
