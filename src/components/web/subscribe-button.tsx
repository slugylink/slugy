"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";

interface SubscribeButtonProps {
  isReady: boolean;
  price: number;
  buttonLabel: string;
  priceId: string;
  planId: string;
  isUpgrade: boolean;
}

export default function SubscribeButton({
  isReady,
  price,
  buttonLabel,
  priceId,
  planId,
  isUpgrade,
}: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId, planId, isUpgrade }),
      });

      const { sessionId } = (await response.json()) as { sessionId: string };
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!,
      );
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      disabled={!isReady || isLoading}
      variant={+price === 0 ? "outline" : "default"}
      className="w-full rounded-lg"
      onClick={handleSubscribe}
    >
      {buttonLabel}
    </Button>
  );
}
