"use client";
import { useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkUserExists, authClient } from "@/lib/auth-client";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import SocialLoginButtons from "./social-login-buttons";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginUiState = {
  showPassword: boolean;
  isGithubLoading: boolean;
  isGoogleLoading: boolean;
  isPasswordLogin: boolean;
  isLoading: boolean;
  isRedirecting: boolean;
  lastUsedProvider: string | null;
};

type LoginUiAction =
  | { type: "SET_SHOW_PASSWORD"; payload: boolean }
  | { type: "SET_GITHUB_LOADING"; payload: boolean }
  | { type: "SET_GOOGLE_LOADING"; payload: boolean }
  | { type: "SET_PASSWORD_LOGIN"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_REDIRECTING"; payload: boolean }
  | { type: "SET_LAST_PROVIDER"; payload: string | null }
  | { type: "HYDRATE_LAST_PROVIDER"; payload: string | null };

const initialUiState: LoginUiState = {
  showPassword: false,
  isGithubLoading: false,
  isGoogleLoading: false,
  isPasswordLogin: false,
  isLoading: false,
  isRedirecting: false,
  lastUsedProvider: null,
};

function loginUiReducer(state: LoginUiState, action: LoginUiAction) {
  switch (action.type) {
    case "SET_SHOW_PASSWORD":
      return { ...state, showPassword: action.payload };
    case "SET_GITHUB_LOADING":
      return { ...state, isGithubLoading: action.payload };
    case "SET_GOOGLE_LOADING":
      return { ...state, isGoogleLoading: action.payload };
    case "SET_PASSWORD_LOGIN":
      return { ...state, isPasswordLogin: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_REDIRECTING":
      return { ...state, isRedirecting: action.payload };
    case "SET_LAST_PROVIDER":
    case "HYDRATE_LAST_PROVIDER":
      return { ...state, lastUsedProvider: action.payload };
    default:
      return state;
  }
}

function PasswordField({
  email,
  isPasswordLogin,
  showPassword,
  register,
  errors,
  disabled,
  onTogglePassword,
}: {
  email: string;
  isPasswordLogin: boolean;
  showPassword: boolean;
  register: UseFormRegister<LoginFormData>;
  errors: FieldErrors<LoginFormData>;
  disabled: boolean;
  onTogglePassword: () => void;
}) {
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
          placeholder="Enter your password"
          {...register("password", {
            required: isPasswordLogin ? "Password is required" : false,
          })}
          className={cn(
            "w-full pr-10",
            errors.password && "border-red-500 focus-visible:ring-red-500",
          )}
          required={isPasswordLogin}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
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
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [state, dispatch] = useReducer(loginUiReducer, initialUiState);
  const {
    showPassword,
    isGithubLoading,
    isGoogleLoading,
    isPasswordLogin,
    isLoading,
    isRedirecting,
    lastUsedProvider,
  } = state;

  // Computed state: true if any authentication is in progress
  const isAnyAuthInProgress =
    isLoading || isGoogleLoading || isGithubLoading || isRedirecting;

  useEffect(() => {
    // Load last used provider from localStorage (client-side only)
    try {
      const savedProvider = localStorage.getItem("lastUsedProvider");
      if (
        savedProvider &&
        ["google", "github", "credential"].includes(savedProvider)
      ) {
        dispatch({ type: "HYDRATE_LAST_PROVIDER", payload: savedProvider });
      }
    } catch (error) {
      // localStorage might not be available in some environments
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to access localStorage:", error);
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleGoogleLogin = async () => {
    dispatch({ type: "SET_GOOGLE_LOADING", payload: true });
    try {
      await authClient.signIn.social(
        {
          provider: "google",
        },
        {
          onSuccess: () => {
            // Save last used provider
            try {
              localStorage.setItem("lastUsedProvider", "google");
            } catch (error) {
              // localStorage might not be available
            }
            dispatch({ type: "SET_LAST_PROVIDER", payload: "google" });
            dispatch({ type: "SET_REDIRECTING", payload: true });
            router.push("/");
            router.refresh();
          },
          onError: (err) => {
            dispatch({ type: "SET_REDIRECTING", payload: false });
            toast.error(
              err instanceof Error
                ? err.message
                : "Failed to log in with Google",
            );
          },
        },
      );
    } catch (err) {
      dispatch({ type: "SET_REDIRECTING", payload: false });
      toast.error("An unexpected error occurred during Google login");
      console.error("Google login error:", err);
    }
    dispatch({ type: "SET_GOOGLE_LOADING", payload: false });
  };

  const handleGithubLogin = async () => {
    dispatch({ type: "SET_GITHUB_LOADING", payload: true });
    try {
      await authClient.signIn.social(
        {
          provider: "github",
        },
        {
          onSuccess: () => {
            // Save last used provider
            try {
              localStorage.setItem("lastUsedProvider", "github");
            } catch (error) {
              // localStorage might not be available
            }
            dispatch({ type: "SET_LAST_PROVIDER", payload: "github" });
            dispatch({ type: "SET_REDIRECTING", payload: true });
            router.push("/");
            router.refresh();
          },
          onError: (err) => {
            dispatch({ type: "SET_REDIRECTING", payload: false });
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
      dispatch({ type: "SET_REDIRECTING", payload: false });
      console.error("GitHub login error:", err);
      toast.error(
        "An unexpected error occurred during GitHub login. Please try again.",
      );
    }
    dispatch({ type: "SET_GITHUB_LOADING", payload: false });
  };

  const handlePasswordLogin = async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      await authClient.signIn.email(
        {
          email,
          password,
        },
        {
          onSuccess: () => {
            // Save last used provider
            try {
              localStorage.setItem("lastUsedProvider", "credential");
            } catch (error) {
              // localStorage might not be available
            }
            dispatch({ type: "SET_LAST_PROVIDER", payload: "credential" });
            dispatch({ type: "SET_REDIRECTING", payload: true });
            router.push("/");
            router.refresh();
          },
          onError: (err) => {
            dispatch({ type: "SET_REDIRECTING", payload: false });
            toast.error(
              err instanceof Error ? err.message : "Invalid email or password",
            );
          },
        },
      );
    } catch (err) {
      dispatch({ type: "SET_REDIRECTING", payload: false });
      toast.error("An unexpected error occurred during login");
      console.error("Login error:", err);
    }
    dispatch({ type: "SET_LOADING", payload: false });
  };

  const handleResendVerification = async (email: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      await authClient.sendVerificationEmail({ email });
      toast.success("Verification email sent! Please check your inbox.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to send verification email",
      );
    }
    dispatch({ type: "SET_LOADING", payload: false });
  };

  const handleMagicLinkLogin = async (email: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      await authClient.signIn.magicLink(
        {
          email,
          callbackURL: "/",
        },
        {
          onSuccess: () => {
            toast.success("Magic link sent! Please check your email.");
          },
          onError: (err) => {
            toast.error(
              err instanceof Error ? err.message : "Failed to send magic link",
            );
          },
        },
      );
    } catch (err) {
      toast.error("An unexpected error occurred while sending magic link");
      console.error("Magic link error:", err);
    }
    dispatch({ type: "SET_LOADING", payload: false });
  };

  const onSubmit = async (data: LoginFormData) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      if (!isPasswordLogin) {
        const userData = await checkUserExists(data.email);

        if (!userData.exists) {
          toast.error("No account found with this email. Please sign up.");
          dispatch({ type: "SET_LOADING", payload: false });
          return;
        }

        if (!userData.emailVerified) {
          await handleResendVerification(data.email);
          dispatch({ type: "SET_LOADING", payload: false });
          return;
        }

        // If user has a credential account, show password field
        if (userData.provider === "credential") {
          dispatch({ type: "SET_PASSWORD_LOGIN", payload: true });
          dispatch({ type: "SET_LOADING", payload: false });
          return;
        }

        // For social provider users, send magic link instead of trying password auth
        if (userData.provider && userData.provider !== "credential") {
          await handleMagicLinkLogin(data.email);
          dispatch({ type: "SET_LOADING", payload: false });
          return;
        }

        // Fallback to magic link if no provider is found (user might have signed up with magic link)
        await handleMagicLinkLogin(data.email);
        dispatch({ type: "SET_LOADING", payload: false });
      } else if (data.password && data.password.trim()) {
        await handlePasswordLogin(data.email, data.password);
        dispatch({ type: "SET_LOADING", payload: false });
      } else {
        toast.error("Password is required");
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign in");
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

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
                disabled={isAnyAuthInProgress}
              />
            </div>

            <PasswordField
              email={watch("email")}
              isPasswordLogin={isPasswordLogin}
              showPassword={showPassword}
              register={register}
              errors={errors}
              disabled={isAnyAuthInProgress}
              onTogglePassword={() =>
                dispatch({
                  type: "SET_SHOW_PASSWORD",
                  payload: !showPassword,
                })
              }
            />

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 cursor-pointer"
                disabled={isAnyAuthInProgress || isSubmitting}
              >
                {isLoading && (
                  <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
                )}{" "}
                {isPasswordLogin ? "Sign in" : "Continue with email"}
              </Button>
            </div>

            <SocialLoginButtons
              handleGoogleLogin={handleGoogleLogin}
              handleGithubLogin={handleGithubLogin}
              isLoading={isAnyAuthInProgress}
              isSubmitting={isSubmitting}
              isGoogleLoading={isGoogleLoading}
              isGithubLoading={isGithubLoading}
              lastUsedProvider={lastUsedProvider}
            />

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
