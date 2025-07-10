"use client";
import { swrConfig } from "@/lib/swr-config";
import { SWRConfig } from "swr";
// import { createAuthClient } from "better-auth/react";
// import { redirect } from "next/navigation";
// const { useSession } = createAuthClient();

export function Providers({ children }: { children: React.ReactNode }) {
  // const { data: session } = useSession();

  // if (!session) return redirect("/login");
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
