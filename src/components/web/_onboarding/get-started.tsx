"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createFreeSubscription } from "@/server/actions/onbaording/get-started";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { toast } from "sonner";

const ONBOARDING_NEXT_PATH = "/onboarding/create-workspace";

interface GetStartedProps {
  userId: string;
}

export default function GetStarted({ userId }: GetStartedProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createFreeSubscription(userId);
      if (result.success) {
        router.push(ONBOARDING_NEXT_PATH);
        return;
      }
      toast.error(result.message);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading && (
          <LoaderCircle className="mr-1 h-5 w-5 animate-spin" aria-hidden />
        )}
        Get started
      </Button>
    </form>
  );
}
