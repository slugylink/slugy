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
import { checkUserExists, authClient } from "@/lib/auth-client";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import GoogleIcon from "@/utils/icons/google";
import { FaGithub } from "react-icons/fa6";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required").optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPasswordLogin, setIsPasswordLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
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
            toast.error(
              err instanceof Error
                ? err.message
                : "Failed to log in with Google",
            );
          },
        },
      );
    } catch (err) {
      toast.error("An unexpected error occurred during Google login");
      console.error("Google login error:", err);
    } finally {
      setIsGoogleLoading(false);
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      setIsLoading(true);
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
            console.error("GitHub login error details:", err);
            toast.error(
              err instanceof Error
                ? err.message
                : "Failed to log in with GitHub. Please check your GitHub OAuth configuration.",
            );
          },
        },
      );
    } catch (err) {
      console.error("GitHub login error:", err);
      toast.error("An unexpected error occurred during GitHub login. Please try again.");
    } finally {
      setIsGithubLoading(false);
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await authClient.signIn.email(
        {
          email,
          password,
        },
        {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
          onError: (err) => {
            toast.error(
              err instanceof Error ? err.message : "Invalid email or password",
            );
          },
        },
      );
    } catch (err) {
      toast.error("An unexpected error occurred during login");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (email: string) => {
    try {
      setIsLoading(true);
      await authClient.sendVerificationEmail({ email });
      toast.success("Verification email sent! Please check your inbox.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to send verification email",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      if (!isPasswordLogin) {
        const userData = await checkUserExists(data.email);

        if (!userData.exists) {
          toast.error("No account found with this email. Please sign up.");
          return;
        }

        if (!userData.emailVerified) {
          await handleResendVerification(data.email);
          return;
        }

        if (userData.provider === "credential") {
          setIsPasswordLogin(true);
          return;
        }

        await handlePasswordLogin(data.email, data.password || "");
      } else if (data.password) {
        await handlePasswordLogin(data.email, data.password);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasswordField = (email: string) => {
    if (!isPasswordLogin) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            className="text-muted-foreground text-xs underline"
            href={`/forgot-password?email=${email}`}
          >
            Forgot Password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder=""
            {...register("password")}
            className={cn(
              "w-full pr-10",
              errors.password && "border-red-500 focus-visible:ring-red-500",
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
      </div>
    );
  };

  const renderSocialButtons = () => (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">Or</span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        className="w-full cursor-pointer"
        disabled={
          isLoading || isSubmitting || isGoogleLoading || isGithubLoading
        }
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
        disabled={
          isLoading || isSubmitting || isGoogleLoading || isGithubLoading
        }
      >
        {isGithubLoading ? (
          <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
        ) : (
          <FaGithub className="mr-1 h-5 w-5" />
        )}
        Continue with GitHub
      </Button>
    </>
  );

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="mx-auto w-full border-none shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-xl font-medium">
            Log in to your Slugy account
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
            </div>

            {renderPasswordField(watch("email"))}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 cursor-pointer"
                disabled={
                  isLoading ||
                  isSubmitting ||
                  isGoogleLoading ||
                  isGithubLoading
                }
              >
                {isLoading && (
                  <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
                )}{" "}
                {isPasswordLogin ? "Sign in" : "Continue with email"}
              </Button>
            </div>

            {renderSocialButtons()}

            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary underline">
                Sign up
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
