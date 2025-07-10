"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkUserExists,
  authClient,
} from "@/lib/auth-client";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import GoogleIcon from "@/utils/icons/google";
import { FaGithub } from "react-icons/fa6";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { FaCircleCheck } from "react-icons/fa6";

const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(100, "Email must be less than 100 characters"),
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
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    watch,
    reset,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const passwordValue = watch("password", "");

  const passwordChecks = {
    length: passwordValue.length >= 8,
    uppercase: /[A-Z]/.test(passwordValue),
    lowercase: /[a-z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
    special: /[^A-Za-z0-9]/.test(passwordValue),
  };

  const handleGoogleLogin = async () => {
    await authClient.signIn.social(
      {
        provider: "google",
      },
      {
        onRequest: () => {
          setIsGoogleLoading(true);
        },
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to log in");
        },
      },
    );
    setIsGoogleLoading(false);
  };

  const handleGithubLogin = async () => {
    await authClient.signIn.social(
      {
        provider: "github",
      },
      {
        onRequest: () => {
          setIsGithubLoading(true);
        },
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to log in");
        },
      },
    );
    setIsGithubLoading(false);
  };

  const onSubmit = async (data: SignupFormData) => {
    try {
      // First check if user already exists
      const userData = await checkUserExists(data.email);
      if (userData.exists) {
        toast.error(
          "An account with this email already exists. Please log in instead.",
        );
        router.push("/login");
        return;
      }

      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: data.name,
        },
        {
          onRequest: () => {
            setPending(true);
          },
          onSuccess: () => {
            toast.success(
              "Account created! Please check your email to complete your registration.",
            );
            reset();
            setShowPassword(false);
          },
          onError: (err) => {
            toast.error(
              err instanceof Error ? err.message : "Failed to create account",
            );
          },
        },
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create account",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="mx-auto w-full border-none shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-xl font-medium">
            Create your Slugy account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                {...register("name")}
                className={cn(
                  "w-full",
                  errors.name && "border-red-500 focus-visible:ring-red-500",
                )}
                required
              />
            </div>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className={cn("relative")}>
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
                      passwordChecks.length
                        ? "text-green-500"
                        : "text-zinc-400",
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
                  <span className="text-muted-foreground">
                    Uppercase letter
                  </span>
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
                  <span className="text-muted-foreground">
                    Lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <FaCircleCheck
                    className={cn(
                      "h-2.5 w-2.5",
                      passwordChecks.number
                        ? "text-green-500"
                        : "text-zinc-400",
                    )}
                  />
                  <span className="text-muted-foreground">Number</span>
                </div>
                <div className="flex items-center gap-1">
                  <FaCircleCheck
                    className={cn(
                      "h-2.5 w-2.5",
                      passwordChecks.special
                        ? "text-green-500"
                        : "text-zinc-400",
                    )}
                  />
                  <span className="text-muted-foreground">
                    Special character
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                type="submit"
                className="flex-1 cursor-pointer"
                disabled={
                  isSubmitting || pending || isGoogleLoading || isGithubLoading
                }
              >
                {isSubmitting && (
                  <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
                )}{" "}
                Sign up
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  Or
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full cursor-pointer"
              disabled={isSubmitting || isGoogleLoading || isGithubLoading}
            >
              {isGoogleLoading ? (
                <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
              ) : (
                <GoogleIcon className="mr-1 h-3.5 w-3.5" />
              )}
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGithubLogin}
              className="w-full cursor-pointer"
              disabled={isSubmitting || isGoogleLoading || isGithubLoading}
            >
              {isGithubLoading ? (
                <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
              ) : (
                <FaGithub className="mr-1 h-5 w-5" />
              )}
              Continue with GitHub
            </Button>

            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary underline">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground px-8 text-center text-xs">
        By clicking continue, you agree to our{" "}
        <Link
          href="/terms"
          className="hover:text-primary underline underline-offset-4"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="hover:text-primary underline underline-offset-4"
        >
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
