import { createAuthClient } from "better-auth/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [
    "https://slugy.co",
    "https://app.slugy.co",
    "http://localhost:3000",
    "http://app.localhost:3000",
  ],
  plugins: [magicLinkClient(), adminClient(), organizationClient()],
});

export const { signUp, signIn, signOut, useSession } = authClient;

export const checkUserExists = async (email: string) => {
  const response = await fetch(
    `/api/auth/check-user?email=${encodeURIComponent(email)}`,
  );
  const data = await response.json();
  return data;
};

export const signInWithGithub = async () => {
  const data = await authClient.signIn.social({
    provider: "github",
    callbackURL: "/",
  });
  return data;
};

export const signInWithGoogle = async () => {
  const data = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/",
  });
  return data;
};

export const signInWithMagicLink = async (email: string) => {
  const data = await authClient.signIn.magicLink({
    email,
    callbackURL: "/",
  });
  return data;
};

export const signUpWithMagicLink = async (email: string) => {
  const data = await authClient.signIn.magicLink({
    email,
    callbackURL: "/",
  });
  return data;
};
