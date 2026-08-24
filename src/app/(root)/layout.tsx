import React from "react";
import Footer from "./_components/footer";
import Navbar from "./_components/navbar";

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="h-full flex-col bg-white dark:bg-[#121212]">
      <Navbar />
      <div className="">{children}</div>
      <Footer />
    </main>
  );
};

export default HomeLayout;
