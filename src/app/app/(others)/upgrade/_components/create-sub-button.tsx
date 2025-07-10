"use client";
import React from "react";
import { Button } from "@/components/ui/button";

const CreateSubButton = ({
  btnText,
  plan,
}: {
  btnText: string;
  plan:{
    name: string
  };
}) => {
  const handleCreateSub = async () => {
    try {
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: plan.name,
          successUrl: "/dashboard",
          cancelUrl: "/pricing",
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      alert(error instanceof Error ? error.message : "Failed to create subscription");
    }
  };
  
  return (
    <div>
      <Button onClick={handleCreateSub}>{btnText}</Button>
    </div>
  );
};

export default CreateSubButton;
