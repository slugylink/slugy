import GetStarted from "@/components/web/_onboarding/get-started";
import AppLogo from "@/components/web/app-logo";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function WelcomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) redirect("/login");

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
        <div className="relative flex max-w-md flex-col items-center space-y-8">
          <AppLogo />
          <div className="space-y-3">
            <h2 className="text-xl font-medium text-zinc-800 dark:text-white">
              Welcome to Slugy
            </h2>
            <p className="text-muted-foreground text-base">
              Shorten smarter, share better, and grow faster{" "}
              <br />
              with every link you create.
            </p>
          </div>
          <GetStarted userId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
