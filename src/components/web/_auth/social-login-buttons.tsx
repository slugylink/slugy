import { Button } from "@/components/ui/button";
import GoogleIcon from "@/utils/icons/google";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { FaGithub } from "react-icons/fa6";

interface SocialLoginButtonsProps {
  handleGoogleLogin: () => Promise<void>;
  handleGithubLogin: () => Promise<void>;
  isLoading: boolean;
  isSubmitting: boolean;
  isGoogleLoading: boolean;
  isGithubLoading: boolean;
}

export default function SocialLoginButtons({
  handleGoogleLogin,
  handleGithubLogin,
  isLoading,
  isSubmitting,
  isGoogleLoading,
  isGithubLoading,
}: SocialLoginButtonsProps) {
    return (
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
    )
}