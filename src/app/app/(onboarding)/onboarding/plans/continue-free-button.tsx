"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createFreeSubscription } from "@/server/actions/onbaording/get-started";
import { LoaderCircle } from "@/utils/icons/loader-circle";

export default function ContinueFreeButton({
  workspace,
}: {
  workspace: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const result = await createFreeSubscription();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      router.push(`/${workspace}`);
      router.refresh();
    } catch {
      toast.error("Could not activate the Free plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleContinue}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
      Continue with Free
    </Button>
  );
}
