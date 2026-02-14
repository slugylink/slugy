import React from "react";
import Footer from "./_components/footer";
import Navbar from "./_components/navbar";
import { getCachedRootSession } from "@/lib/auth";

const HomeLayout = async ({ children }: { children: React.ReactNode }) => {
  // Use cached session to avoid blocking SSR with database calls
  const session = await getCachedRootSession();

  return (
    <main className="h-full flex-col bg-white dark:bg-[#121212]">
      <Navbar session={session} />
      <div className="">{children}</div>
      <Footer />
    </main>
  );
};

export default HomeLayout;
