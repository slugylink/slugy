import UseCaseForm from "@/components/web/_onboarding/use-case-form";
import AppLogo from "@/components/web/app-logo";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function WelcomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { intendedUse: true },
  });

  if (user?.intendedUse) {
    redirect("/onboarding/create-workspace");
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="relative flex w-full max-w-md flex-col items-center space-y-8">
          <AppLogo />
          <div className="w-full space-y-2 text-center">
            <h2 className="text-xl font-medium text-zinc-800 dark:text-white">
              Welcome to Slugy 👋
            </h2>
            <p className="text-muted-foreground text-base">
              What are you planning to use Slugy for?
            </p>
          </div>
          <UseCaseForm />
        </div>
      </div>
    </div>
  );
}
