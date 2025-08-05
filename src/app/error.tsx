"use client";
import { Button } from "@/components/ui/button";
import { Twitter } from "lucide-react";

export default function Error() {
  const handleReport = () => {
    const errorMessage = "I encountered an error on Slugy.co";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(errorMessage)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center space-y-4 p-4">
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-medium">Something went wrong! 🥲</h1>
        <p className="text-muted-foreground">
          We&apos;re sorry for the inconvenience.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size={"sm"} onClick={() => window.location.reload()}>
          Reload Page
        </Button>

        <Button
          variant="outline"
          onClick={handleReport}
          size={"sm"}
          className="flex items-center gap-2"
          aria-label="Report error on Twitter"
        >
          <Twitter className="h-4 w-4" />
          Report on Twitter
        </Button>
      </div>
    </div>
  );
}
