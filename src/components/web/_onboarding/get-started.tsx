"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { createFreeSubscription } from "@/server/actions/onbaording/get-started";
import { toast } from "sonner";

export default function GetStarted({ userId }: { userId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await createFreeSubscription(userId);
      if (result.success) {
        router.push("/onboarding/create-workspace");
      } else {
        console.error("Failed to create subscription:", result.message);
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error in get started:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />}
        Get started
      </Button>
    </form>
  );
}
