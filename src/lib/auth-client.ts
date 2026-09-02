import { origins } from "@/constants/origins";
import { clearWorkspaceSlugCookie } from "@/lib/workspace-cookie";
import { createAuthClient } from "better-auth/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";

// Prefer same-origin so the browser always hits app.slugy.co/api/auth.
// BETTER_AUTH_URL is not available in the client bundle (not NEXT_PUBLIC_*).
const authBaseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      undefined;

export const authClient = createAuthClient({
  ...(authBaseURL ? { baseURL: authBaseURL } : {}),
  trustedOrigins: origins,
  plugins: [magicLinkClient(), adminClient(), organizationClient()],
});

export const { signUp, signIn, signOut, useSession } = authClient;

export const POST_LOGIN_PATH = "/";

/** Hard navigation so cookies from Set-Cookie are applied before the next page. */
export function hardNavigate(path: string) {
  if (typeof window === "undefined") return;
  window.location.assign(path);
}

export async function signOutAndRedirect(to = "/login") {
  try {
    clearWorkspaceSlugCookie();
    await authClient.signOut();
  } catch (error) {
    console.error("Sign out failed:", error);
  } finally {
    hardNavigate(to);
  }
}

export const checkUserExists = async (email: string) => {
  const response = await fetch(
    `/api/auth/check-user?email=${encodeURIComponent(email)}`,
  );
  const data = await response.json();
  return data;
};

export const signInWithGithub = async () => {
  return authClient.signIn.social({
    provider: "github",
    callbackURL: POST_LOGIN_PATH,
  });
};

export const signInWithGoogle = async () => {
  return authClient.signIn.social({
    provider: "google",
    callbackURL: POST_LOGIN_PATH,
  });
};

export const signInWithMagicLink = async (email: string) => {
  return authClient.signIn.magicLink({
    email,
    callbackURL: POST_LOGIN_PATH,
  });
};

export const signUpWithMagicLink = async (email: string) => {
  return authClient.signIn.magicLink({
    email,
    callbackURL: POST_LOGIN_PATH,
  });
};
