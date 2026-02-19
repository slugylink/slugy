"use client";

import { useReducer } from "react";
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
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { FaCircleCheck } from "react-icons/fa6";
import SocialLoginButtons from "./social-login-buttons";
import { validateEmail } from "@/server/actions/validate-email";

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
type PasswordChecks = {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

type SignupUiState = {
  pending: boolean;
  isGithubLoading: boolean;
  isGoogleLoading: boolean;
  isRedirecting: boolean;
  showPassword: boolean;
};

type SignupUiAction =
  | { type: "SET_PENDING"; payload: boolean }
  | { type: "SET_GITHUB_LOADING"; payload: boolean }
  | { type: "SET_GOOGLE_LOADING"; payload: boolean }
  | { type: "SET_REDIRECTING"; payload: boolean }
  | { type: "SET_SHOW_PASSWORD"; payload: boolean }
  | { type: "TOGGLE_SHOW_PASSWORD" };

const initialUiState: SignupUiState = {
  pending: false,
  isGithubLoading: false,
  isGoogleLoading: false,
  isRedirecting: false,
  showPassword: false,
};

function signupUiReducer(
  state: SignupUiState,
  action: SignupUiAction,
): SignupUiState {
  switch (action.type) {
    case "SET_PENDING":
      return { ...state, pending: action.payload };
    case "SET_GITHUB_LOADING":
      return { ...state, isGithubLoading: action.payload };
    case "SET_GOOGLE_LOADING":
      return { ...state, isGoogleLoading: action.payload };
    case "SET_REDIRECTING":
      return { ...state, isRedirecting: action.payload };
    case "SET_SHOW_PASSWORD":
      return { ...state, showPassword: action.payload };
    case "TOGGLE_SHOW_PASSWORD":
      return { ...state, showPassword: !state.showPassword };
    default:
      return state;
  }
}

function SignupNameField({
  register,
  errorMessage,
  disabled,
}: {
  register: ReturnType<typeof useForm<SignupFormData>>["register"];
  errorMessage?: string;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="name">Name</Label>
      <Input
        id="name"
        type="text"
        placeholder="John Doe"
        {...register("name")}
        className={cn(
          "w-full",
          errorMessage && "border-red-500 focus-visible:ring-red-500",
        )}
        aria-invalid={!!errorMessage}
        aria-describedby={errorMessage ? "name-error" : undefined}
        required
        disabled={disabled}
      />
      {errorMessage && (
        <p id="name-error" role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function SignupEmailField({
  register,
  errorMessage,
  disabled,
}: {
  register: ReturnType<typeof useForm<SignupFormData>>["register"];
  errorMessage?: string;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="m@example.com"
        {...register("email")}
        className={cn(
          "w-full",
          errorMessage && "border-red-500 focus-visible:ring-red-500",
        )}
        aria-invalid={!!errorMessage}
        aria-describedby={errorMessage ? "email-error" : undefined}
        required
        disabled={disabled}
      />
      {errorMessage && (
        <p id="email-error" role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function PasswordRequirements({ checks }: { checks: PasswordChecks }) {
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
      aria-live="polite"
    >
      <div className="flex items-center gap-1">
        <FaCircleCheck
          className={cn(
            "h-2.5 w-2.5",
            checks.length ? "text-green-500" : "text-zinc-400",
          )}
        />
        <span className="text-muted-foreground">8 characters</span>
      </div>
      <div className="flex items-center gap-1">
        <FaCircleCheck
          className={cn(
            "h-2.5 w-2.5",
            checks.uppercase ? "text-green-500" : "text-zinc-400",
          )}
        />
        <span className="text-muted-foreground">Uppercase letter</span>
      </div>
      <div className="flex items-center gap-1">
        <FaCircleCheck
          className={cn(
            "h-2.5 w-2.5",
            checks.lowercase ? "text-green-500" : "text-zinc-400",
          )}
        />
        <span className="text-muted-foreground">Lowercase letter</span>
      </div>
      <div className="flex items-center gap-1">
        <FaCircleCheck
          className={cn(
            "h-2.5 w-2.5",
            checks.number ? "text-green-500" : "text-zinc-400",
          )}
        />
        <span className="text-muted-foreground">Number</span>
      </div>
      <div className="flex items-center gap-1">
        <FaCircleCheck
          className={cn(
            "h-2.5 w-2.5",
            checks.special ? "text-green-500" : "text-zinc-400",
          )}
        />
        <span className="text-muted-foreground">Special character</span>
      </div>
    </div>
  );
}

function SignupPasswordField({
  register,
  showPassword,
  passwordChecks,
  errorMessage,
  disabled,
  onTogglePassword,
}: {
  register: ReturnType<typeof useForm<SignupFormData>>["register"];
  showPassword: boolean;
  passwordChecks: PasswordChecks;
  errorMessage?: string;
  disabled: boolean;
  onTogglePassword: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          {...register("password")}
          className={cn(
            "w-full pr-10",
            errorMessage && "border-red-500 focus-visible:ring-red-500",
          )}
          aria-invalid={!!errorMessage}
          aria-describedby={errorMessage ? "password-error" : undefined}
          required
          minLength={8}
          maxLength={100}
          autoComplete="new-password"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={showPassword ? "Hide password" : "Show password"}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {errorMessage && (
        <p id="password-error" role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}
      <PasswordRequirements checks={passwordChecks} />
    </div>
  );
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [state, dispatch] = useReducer(signupUiReducer, initialUiState);
  const {
    pending,
    isGithubLoading,
    isGoogleLoading,
    isRedirecting,
    showPassword,
  } = state;

  // Computed state: true if any authentication is in progress
  const isAnyAuthInProgress =
    pending || isGoogleLoading || isGithubLoading || isRedirecting;

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
    try {
      dispatch({ type: "SET_GOOGLE_LOADING", payload: true });
      await authClient.signIn.social(
        { provider: "google" },
        {
          onSuccess: () => {
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
    } finally {
      dispatch({ type: "SET_GOOGLE_LOADING", payload: false });
    }
  };

  const handleGithubLogin = async () => {
    try {
      dispatch({ type: "SET_GITHUB_LOADING", payload: true });
      await authClient.signIn.social(
        { provider: "github" },
        {
          onSuccess: () => {
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
    } finally {
      dispatch({ type: "SET_GITHUB_LOADING", payload: false });
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    try {
      dispatch({ type: "SET_PENDING", payload: true });

      // EMAIL FRAUD VALIDATION ONLY ON SUBMIT
      const validationResult = await validateEmail(data.email);

      if ("error" in validationResult) {
        toast.error(validationResult.error);
        return;
      }

      if (validationResult.isFraud) {
        toast.error("This email address appears to be suspicious.");
        return;
      }

      // Check if user already exists
      const userData = await checkUserExists(data.email);
      if (userData.exists) {
        toast.error(
          "An account with this email already exists. Please log in instead.",
        );
        return;
      }

      // Proceed with signup
      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: data.name,
        },
        {
          onSuccess: () => {
            toast.success(
              "Account created! Please check your email to complete your registration.",
            );
            reset();
            dispatch({ type: "SET_SHOW_PASSWORD", payload: false });
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
      dispatch({ type: "SET_PENDING", payload: false });
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
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <SignupNameField
              register={register}
              errorMessage={errors.name?.message}
              disabled={isAnyAuthInProgress}
            />
            <SignupEmailField
              register={register}
              errorMessage={errors.email?.message}
              disabled={isAnyAuthInProgress}
            />
            <SignupPasswordField
              register={register}
              showPassword={showPassword}
              passwordChecks={passwordChecks}
              errorMessage={errors.password?.message}
              disabled={isAnyAuthInProgress}
              onTogglePassword={() =>
                dispatch({ type: "TOGGLE_SHOW_PASSWORD" })
              }
            />

            <div className="flex gap-1">
              <Button
                type="submit"
                className="flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isAnyAuthInProgress || isSubmitting}
                aria-busy={isSubmitting || pending}
              >
                {(isSubmitting || pending) && (
                  <LoaderCircle className="mr-1 h-2.5 w-2.5 animate-[spin_1.2s_linear_infinite]" />
                )}{" "}
                Sign up
              </Button>
            </div>

            <SocialLoginButtons
              handleGoogleLogin={handleGoogleLogin}
              handleGithubLogin={handleGithubLogin}
              isLoading={isAnyAuthInProgress}
              isSubmitting={isSubmitting}
              isGoogleLoading={isGoogleLoading}
              isGithubLoading={isGithubLoading}
            />

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
