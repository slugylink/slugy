"use client";
import React from "react";
import { Button } from "@/components/ui/button";

const UpdateSubButton = ({
  btnText,
  plan,
  subId,
}: {
  btnText: string;
  plan: {
    name: string;
  };
  subId: string;
}) => {
  const handleUpdateSub = async () => {
    try {
      const response = await fetch("/api/subscription/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subId,
          plan: plan.name,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update subscription");
      }
      alert("Subscription updated successfully!");
    } catch (error) {
      console.error("Error updating subscription:", error);
      alert(error instanceof Error ? error.message : "Failed to update subscription");
    }
  };

  return (
    <div>
      <Button onClick={handleUpdateSub}>{btnText}</Button>
    </div>
  );
};

export default UpdateSubButton;
