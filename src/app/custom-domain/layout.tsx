import type { Metadata } from "next";
import Navbar from "../(root)/_components/navbar";
import Footer from "../(root)/_components/footer";

export const metadata: Metadata = {
  title: "Custom Domain - Powered by Slugy",
  description: "Custom domain landing page",
};

export default function CustomDomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar session={null} />
      {children} <Footer />
    </>
  );
}
