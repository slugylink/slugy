import type { Metadata } from "next";
import Navbar from "../(root)/_components/navbar";
import Footer from "../(root)/_components/footer";

// Infra route with site chrome, never indexed (see /features/custom-domains).
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function CustomDomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
