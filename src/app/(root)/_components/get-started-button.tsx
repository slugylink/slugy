"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Session } from "@/lib/auth";
import { createAuthClient } from "better-auth/react";

type GetStartedButtonProps = {
  session?: Session | null;
  className?: string;
};

const { useSession } = createAuthClient();

const GetStartedButton = ({ className }: GetStartedButtonProps) => {
  const { data: session } = useSession();

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`
      : "http://app.localhost:3000";

  const destination = session ? baseUrl : `${baseUrl}/login`;
  const label = session ? "Dashboard" : "Sign in";

  return (
    <div className={className}>
      <Link href={destination} className="w-full sm:w-fit">
        <Button variant="outline" className="group w-full sm:w-fit">
          <span>{label}</span>
        </Button>
      </Link>
    </div>
  );
};

export default GetStartedButton;
