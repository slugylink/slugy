"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createAuthClient } from "better-auth/react";
import { FaGithub } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { getGitHubStars } from "@/server/actions/get-github-stats";

type GetStartedButtonProps = {
  className?: string;
};

const { useSession } = createAuthClient();

const useGitHubStars = () => {
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStars = async () => {
      try {
        const starCount = await getGitHubStars();
        if (isMounted) setStars(starCount);
      } catch (error) {
        console.error("Error fetching GitHub stars:", error);
        if (isMounted) setStars(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStars();
    return () => {
      isMounted = false; // Cancel setting state if unmounted
    };
  }, []);

  return { stars, loading };
};

const GetStartedButton: React.FC<GetStartedButtonProps> = ({ className }) => {
  const { data: session } = useSession();
  const { stars, loading } = useGitHubStars();

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
      : "http://app.localhost:3000";

  const destination = session ? baseUrl : `${baseUrl}/login`;
  const label = session ? "Dashboard" : "Get started";

  return (
    <div className={cn(className, "flex gap-2")}>
      <Link
        href="https://slugy.co/git"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View Slugy on GitHub"
        className="w-fit"
      >
        <Button variant="ghost" className="group w-fit" aria-busy={loading}>
          <FaGithub className="h-5 w-5" />
          <span className="text-xs">{loading ? 0 : (stars ?? 0)}</span>
        </Button>
      </Link>

      <Link href={destination} className="w-full sm:w-fit">
        <Button variant="outline" className="group w-full sm:w-fit">
          <span>{label}</span>
        </Button>
      </Link>
    </div>
  );
};

export default GetStartedButton;
