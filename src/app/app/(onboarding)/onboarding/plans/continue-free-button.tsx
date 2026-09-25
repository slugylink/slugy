"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createFreeSubscription } from "@/server/actions/onbaording/get-started";
import { LoaderCircle } from "@/utils/icons/loader-circle";

export default function ContinueFreeButton({
  workspace,
}: {
  workspace: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    setFailed(false);
    try {
      const result = await createFreeSubscription();
      if (!result.success) {
        toast.error(result.message);
        setFailed(true);
        return;
      }
      // Hard navigation: router.push + router.refresh() can cancel the
      // pending navigation and strand users on the plans page.
      window.location.assign(`/${workspace}`);
    } catch {
      toast.error("Could not activate the Free plan. Please try again.");
      setFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        variant="outline"
        onClick={handleContinue}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
        Continue with Free
      </Button>
      {failed && (
        <p className="mt-2 text-center text-xs">
          <span className="text-muted-foreground">
            Something went wrong, but your workspace is ready —{" "}
          </span>
          <a href={`/${workspace}`} className="font-medium underline">
            go to workspace →
          </a>
        </p>
      )}
    </div>
  );
}
