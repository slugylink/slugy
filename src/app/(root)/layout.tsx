import React from "react";
import Footer from "./_components/footer";
import Navbar from "./_components/navbar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const HomeLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <main className="h-full flex-col bg-[#f4f4f4]/20 dark:bg-[#121212]">
      <Navbar session={session} />
      <div className="pt-[65px]">{children}</div>
      <Footer />
    </main>
  );
};

export default HomeLayout;
