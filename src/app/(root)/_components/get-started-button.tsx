"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createAuthClient } from "better-auth/react";
import { FaGithub } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import NumberFlow from "@number-flow/react";

type GetStartedButtonProps = {
  isGitVisible: boolean;
  className?: string;
};

const { useSession } = createAuthClient();

const useGitHubStars = () => {
  const repo = "slugylink/slugy";

  const { data, error } = useSWR<{ stargazers_count: number }>(
    `https://api.github.com/repos/${repo}`,
    fetcher,
    {
      dedupingInterval: 3600000, // 1 hour cache
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      fallbackData: { stargazers_count: 0 },
    },
  );

  return {
    stars: data?.stargazers_count,
    isLoading: !error && !data,
    isError: !!error,
  };
};

const GetStartedButton: React.FC<GetStartedButtonProps> = ({
  isGitVisible,
  className,
}) => {
  const { data: session } = useSession();
  const { stars, isLoading } = useGitHubStars();

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
      : "http://app.localhost:3000";

  // Route according to session state
  const destination = session ? baseUrl : `${baseUrl}/login`;
  const label = session ? "Dashboard" : "Get started  ";

  return (
    <div className={cn(className, "flex gap-2")}>
      {isGitVisible && (
        <Link
          href="https://github.com/slugylink/slugy"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Slugy on GitHub"
          className="w-fit"
        >
          <Button variant="ghost" className="group w-fit">
            <FaGithub className="h-5 w-5" />
            <NumberFlow
              value={isLoading ? 0 : (stars ?? 0)}
              format={{ notation: "compact", maximumFractionDigits: 1 }}
              className="text-xs"
            />
          </Button>
        </Link>
      )}

      <Link href={destination} className="w-full sm:w-fit">
        <Button variant="default" className="group w-full sm:w-fit">
          <span>{label}</span>
        </Button>
      </Link>
    </div>
  );
};

export default GetStartedButton;
