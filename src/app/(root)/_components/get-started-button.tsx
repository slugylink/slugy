"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import NumberFlow from "@number-flow/react";
import { useState, useCallback, useEffect } from "react";

type GetStartedButtonProps = {
  isGitVisible?: boolean;
  showAuthButtons?: boolean;
  className?: string;
};

function useGitHubStars(repo: string) {
  const { data, error } = useSWR<{ stargazers_count: number }>(
    `https://api.github.com/repos/${repo}`,
    fetcher,
    {
      dedupingInterval: 3_600_000,
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
  return process.env.NODE_ENV === "production"
    ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
    : "http://app.localhost:3000";
}

export default function GetStartedButton({
  isGitVisible = true,
  showAuthButtons = true,
  className,
}: GetStartedButtonProps) {
  const { stars, isLoading } = useGitHubStars("slugylink/slugy");
  const [navigatingTo, setNavigatingTo] = useState<"login" | "signup" | null>(
    null,
  );

  const appUrl = useAppUrl();
  const loginUrl = `${appUrl}/login`;
  const signupUrl = `${appUrl}/signup`;

  useEffect(() => {
    fetch(appUrl, { method: "GET", mode: "no-cors" }).catch(() => {});
  }, [appUrl]);

  const prefetch = useCallback(() => {
    fetch(appUrl, { method: "GET", mode: "no-cors" }).catch(() => {});
  }, [appUrl]);

  return (
    <>
      <link rel="preconnect" href={appUrl} />
      <link rel="prefetch" href={appUrl} />

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

        {showAuthButtons && (
          <>
            <a
              href={loginUrl}
              onMouseEnter={prefetch}
              onTouchStart={prefetch}
              onClick={() => setNavigatingTo("login")}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={navigatingTo !== null}
                className="w-full sm:w-fit"
              >
                Login
              </Button>
            </a>

            <a
              href={signupUrl}
              onMouseEnter={prefetch}
              onTouchStart={prefetch}
              onClick={() => setNavigatingTo("signup")}
            >
              <Button
                variant="default"
                size="sm"
                disabled={navigatingTo !== null}
                className="w-full sm:w-fit"
              >
                Sign up
              </Button>
            </a>
          </>
        )}
      </div>
    </>
  );
}
