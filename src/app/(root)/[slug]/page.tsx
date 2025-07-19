"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import NotFound from "../not-found";

const passwordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const SlugPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const params = useParams();
  const slug = params.slug as string;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  if (slug === "not-found") {
    return <NotFound />;
  }

  const onSubmit = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      setIsSuccess(false);

      const response = await fetch(`/api/redirect/${slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Password is correct
        setIsSuccess(true);
        reset();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Handle different error cases
        if (response.status === 404) {
          toast.error("Link not found");
        } else if (response.status === 410) {
          toast.error("Link has expired");
          if (result.redirectUrl) {
            setTimeout(() => {
              window.location.href = result.redirectUrl;
            }, 1500);
          }
        } else if (response.status === 401) {
          toast.error("Invalid password. Please try again.");
          reset();
        } else if (response.status === 400) {
          toast.error(result.error || "Invalid request");
        } else {
          toast.error(result.error || "An error occurred. Please try again.");
        }
      }
    } catch (err) {
      toast.error("Network error. Please check your connection and try again.");
      console.error("Password verification error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-0 flex min-h-svh items-center justify-center bg-transparent pt-0">
      <Card className="w-full max-w-md border-none bg-transparent shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-xl font-medium">
            {isSuccess ? "Password Verified!" : "Enter Password"}
          </CardTitle>
          <p className="text-muted-foreground text-center text-sm">
            {isSuccess
              ? "Redirecting you to the link..."
              : "This link is password protected"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  {...register("password")}
                  className={cn(
                    "w-full pr-10",
                    errors.password &&
                      "border-red-500 focus-visible:ring-red-500",
                  )}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={isLoading || isSubmitting}
            >
              {isLoading && (
                <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
              )}
              {isLoading ? "Verifying..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SlugPassword;
