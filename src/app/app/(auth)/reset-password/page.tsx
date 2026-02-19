"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { FaCircleCheck } from "react-icons/fa6";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm({
  error,
  token,
}: {
  error: string | null;
  token: string | null;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = watch("password", "");

  const passwordChecks = {
    length: passwordValue.length >= 8,
    uppercase: /[A-Z]/.test(passwordValue),
    lowercase: /[a-z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
    special: /[^A-Za-z0-9]/.test(passwordValue),
  };

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);

      if (!token) {
        toast.error(
          "Invalid reset token. Please request a new password reset link.",
        );
        router.push("/forgot-password");
        return;
      }

      const { error } = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password has been reset successfully.");
        router.push("/login");
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.",
      );
      console.error("Password reset error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (error === "invalid_token") {
    return (
      <Card className="mx-auto w-full max-w-sm border-none shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-xl font-medium">
            Invalid Token
          </CardTitle>
          <p className="text-muted-foreground text-center text-sm">
            The token provided is invalid. Please request a new password reset.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link
            href="/forgot-password"
            className="text-primary hover:underline"
          >
            Request new reset link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-sm border-none shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-xl font-medium">
          Reset your password
        </CardTitle>
        <p className="text-muted-foreground text-center text-sm">
          Enter your new password below
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder=""
                {...register("password")}
                className={cn(
                  "w-full pr-10",
                  errors.password &&
                    "border-red-500 focus-visible:ring-red-500",
                )}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <div className="flex items-center gap-1">
                <FaCircleCheck
                  className={cn(
                    "h-2.5 w-2.5",
                    passwordChecks.length ? "text-green-500" : "text-zinc-400",
                  )}
                />
                <span className="text-muted-foreground">8 characters</span>
              </div>
              <div className="flex items-center gap-1">
                <FaCircleCheck
                  className={cn(
                    "h-2.5 w-2.5",
                    passwordChecks.uppercase
                      ? "text-green-500"
                      : "text-zinc-400",
                  )}
                />
                <span className="text-muted-foreground">Uppercase letter</span>
              </div>
              <div className="flex items-center gap-1">
                <FaCircleCheck
                  className={cn(
                    "h-2.5 w-2.5",
                    passwordChecks.lowercase
                      ? "text-green-500"
                      : "text-zinc-400",
                  )}
                />
                <span className="text-muted-foreground">Lowercase letter</span>
              </div>
              <div className="flex items-center gap-1">
                <FaCircleCheck
                  className={cn(
                    "h-2.5 w-2.5",
                    passwordChecks.number ? "text-green-500" : "text-zinc-400",
                  )}
                />
                <span className="text-muted-foreground">Number</span>
              </div>
              <div className="flex items-center gap-1">
                <FaCircleCheck
                  className={cn(
                    "h-2.5 w-2.5",
                    passwordChecks.special ? "text-green-500" : "text-zinc-400",
                  )}
                />
                <span className="text-muted-foreground">Special character</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder=""
                {...register("confirmPassword")}
                className={cn(
                  "w-full pr-10",
                  errors.confirmPassword &&
                    "border-red-500 focus-visible:ring-red-500",
                )}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 cursor-pointer"
              disabled={isLoading || isSubmitting}
            >
              {isLoading && (
                <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
              )}{" "}
              Reset password
            </Button>
          </div>

          <div className="text-center text-sm">
            Remember password?{" "}
            <Link href="/login" className="text-primary underline">
              Back to login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ResetPasswordFormWithSearchParams() {
  const searchParams = useSearchParams();
  return (
    <ResetPasswordForm
      error={searchParams.get("error")}
      token={searchParams.get("token")}
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-svh items-center justify-center">
          <LoaderCircle className="h-5 w-5 animate-[spin_1.2s_linear_infinite]" />
        </div>
      }
    >
      <ResetPasswordFormWithSearchParams />
    </Suspense>
  );
}
