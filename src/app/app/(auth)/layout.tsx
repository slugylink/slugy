import AppLogo from "@/components/web/app-logo";
import Link from "next/link";
import React from "react";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="relative flex w-full max-w-sm flex-col items-center gap-4">
        <div className="fixed inset-x-0 -top-52 m-auto aspect-video max-w-lg bg-gradient-to-tr from-yellow-400 to-violet-400 opacity-40 blur-3xl md:inset-x-16" />
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
            <AppLogo />
          </div>
        </Link>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
