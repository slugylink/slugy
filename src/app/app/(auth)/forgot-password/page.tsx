"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const emailFromParams = searchParams.get("email");

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: emailFromParams || "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      const { error } = await authClient.forgetPassword({
        email: data.email,
        redirectTo: "/reset-password",
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset instructions sent to your email.");
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

  return (
    <Card className="mx-auto w-full max-w-sm border-none shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-xl font-medium">
          Forgot your password?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              {...register("email")}
              className={cn(
                "w-full",
                errors.email && "border-red-500 focus-visible:ring-red-500",
              )}
              required
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
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
              Send reset link
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
};

const LoadingState = () => (
  <Card className="mx-auto w-full max-w-sm border-none shadow-none">
    <CardHeader className="space-y-1">
      <CardTitle className="text-center text-xl font-medium">
        Forgot your password?
      </CardTitle>
    </CardHeader>
    <CardContent className="flex items-center justify-center py-8">
      <LoaderCircle className="h-8 w-8 animate-[spin_1.2s_linear_infinite]" />
    </CardContent>
  </Card>
);

const ForgotPasswordPage = () => {
  return (
    <Suspense fallback={<LoadingState />}>
      <ForgotPasswordForm />
    </Suspense>
  );
};

export default ForgotPasswordPage;
