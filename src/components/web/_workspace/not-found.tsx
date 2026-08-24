"use client";
import { Button } from "@/components/ui/button";
import AppLogo from "../app-logo";
import { signOutAndRedirect } from "@/lib/auth-client";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import React from "react";

export default function WorkspaceNotFound() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignout = async () => {
    setIsLoading(true);
    await signOutAndRedirect("/login");
  };
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent">
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-lg p-8">
        <AppLogo />
        <h1 className="text-card-foreground mt-3 text-center text-xl font-medium">
          Workspace not found
        </h1>
        <p className="text-muted-foreground mb-5 text-center">
          We couldn&apos;t find the workspace.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            disabled={isLoading}
            className="w-full"
            onClick={handleSignout}
          >
            {isLoading && (
              <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
            )}{" "}
            Sign in as a different user
          </Button>
        </div>
      </div>
    </div>
  );
}
