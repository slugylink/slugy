"use client";
import { plans } from "@/constants/data/price";
import React, { useState } from "react";
import { createAuthClient } from "better-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

const { useSession } = createAuthClient();

const UpgardePage = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  // Fetch active subscription
  const { data: subData, isLoading: subLoading } = useSWR<{
    subscription?: {
      plan?: {
        name?: string;
      };
    };
  }>(
    session?.user ? "/api/subscription/active" : null,
    fetcher
  );
  const activePlanName = subData?.subscription?.plan?.name?.toLowerCase();

  const handleClick = async (productId: string) => {
    console.log("Current session:", session); // Debug log
    
    if (!session?.user) {
      console.error("No session found - user not logged in");
      alert("Please log in to continue");
      return;
    }
    
    const customerEmail = encodeURIComponent(session.user.email || "");
    const customerName = encodeURIComponent(session.user.name || "");
    
    // Use relative URL to avoid cross-domain cookie issues
    const checkoutUrl = `/api/subscription/checkout?productId=${productId}&customer_email=${customerEmail}&customer_name=${customerName}`;
    
    console.log("Redirecting to:", checkoutUrl);
    window.location.href = checkoutUrl;
  };

  // Add a function to handle manage subscription
  const handleManageSubscription = async () => {
    if (!session?.user) {
      alert("Please log in to manage your subscription");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/manage", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to get portal link");
      }
    } catch {
      alert("Failed to get portal link");
    } finally {
      setLoading(false);
    }
  };

  // Define features for each plan
  const planFeatures = {
    free: [
      "5 projects",
      "10GB storage",
      "Basic features",
      "Community support"
    ],
    pro: [
      "20 projects", 
      "50GB storage",
      "Advanced features",
      "Priority support",
      "14-day free trial"
    ]
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-muted-foreground">Select the perfect plan for your needs</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "flex flex-col gap-6 rounded-2xl p-6 shadow-none md:p-8",
              plan.name === "pro"
                ? "border-2 border-[#ffaa40] bg-zinc-50 dark:bg-black/50"
                : "bg-background dark:border-zinc-700"
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold capitalize">{plan.name}</h3>
                {plan.name === "pro" && (
                  <div className="rounded-full bg-[#ffaa40] p-1 px-2 text-xs font-medium text-black">
                    Recommended
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {plan.name === "free" 
                  ? "Get started with basic features for personal use."
                  : "Perfect for individuals and small teams who need advanced features."
                }
              </p>
            </div>
            
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold">
                ${plan.monthlyPrice}
              </div>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            
            <Button 
              onClick={() => handleClick(plan.monthlyPriceId)}
              disabled={!session?.user || activePlanName === plan.name || subLoading}
              variant={plan.monthlyPrice === 0 ? "outline" : "default"}
              className="w-full"
            >
              {activePlanName === plan.name
                ? "Currently active"
                : session?.user 
                  ? (plan.monthlyPrice === 0 ? "Start for free" : "Get pro") 
                  : "Please log in"
              }
            </Button>
            
            <ul className="grid gap-2 text-zinc-600 dark:text-zinc-300">
              {planFeatures[plan.name as keyof typeof planFeatures]?.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Button 
        onClick={handleManageSubscription}
        disabled={!session?.user || loading}
        className="mt-8 w-fit"
      >
        {loading ? "Redirecting..." : "Manage Subscription"}
      </Button>
    </div>
  );
};

export default UpgardePage;
