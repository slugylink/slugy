"use client";
import React from "react";
import Link from "next/link";
import AppLogo from "@/components/web/app-logo";
import { usePathname } from "next/navigation";

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ href, children }) => (
  <li className="mt-2">
    <Link
      href={href}
      className="transition-colors duration-300 hover:text-foreground"
    >
      {children}
    </Link>
  </li>
);

interface FooterSectionLink {
  href: string;
  label: string;
}

interface FooterSectionProps {
  title: string;
  links: FooterSectionLink[];
}

const FooterSection: React.FC<FooterSectionProps> = ({ title, links }) => (
  <>
    <div className="mt-10 flex flex-col md:mt-0">
      <h3 className="text-base font-medium">{title}</h3>
      <ul className="mt-4 text-sm text-muted-foreground">
        {links.map((link, index) => (
          <FooterLink key={index} href={link.href}>
            {link.label}
          </FooterLink>
        ))}
      </ul>
    </div>
  </>
);

const Footer: React.FC = () => {
  const footerSections: FooterSectionProps[] = [
    {
      title: "Product",
      links: [
        { href: "", label: "Features" },
        { href: "", label: "Pricing" },
        { href: "/tools/metadatas", label: "Metadata" },
      ],
    },
    {
      title: "About",
      links: [
        { href: "", label: "About Us" },
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms & Conditions" },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "/resources/blog", label: "Blog" },
        { href: "/resources/help", label: "Help" },
      ],
    },
    {
      title: "Connect",
      links: [
        { href: "", label: "Twitter" },
        { href: "", label: "LinkedIn" },
      ],
    },
  ];

  const pathname = usePathname();

  return (
    <>
      {["/", "/tools/metadatas", "/pricing"].includes(pathname) ? (
        <footer className="relative mx-auto mt-24 flex w-full max-w-[80rem] flex-col items-center justify-center border-t border-border bg-transparent bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-4 pb-8 pt-16 md:mt-40 md:pb-0 lg:px-8 lg:pt-24">
          <div className="absolute left-1/2 right-1/2 top-0 h-1.5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
          <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
            <>
              <div className="flex flex-col items-start justify-start md:max-w-[300px]">
                <AppLogo />
                <p className="mt-4 text-start text-sm text-muted-foreground">
                  Simplify Links Like Magic!
                </p>
              </div>
            </>
            <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                {footerSections.slice(0, 2).map((section, index) => (
                  <FooterSection key={index} {...section} />
                ))}
              </div>
              <div className="md:grid md:grid-cols-2 md:gap-8">
                {footerSections.slice(2, 4).map((section, index) => (
                  <FooterSection key={index} {...section} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 w-full border-t border-border/40 pt-4 md:flex md:items-center md:justify-between md:py-4">
            <>
              <p className="mt-4 text-sm text-muted-foreground md:mt-0">
                &copy; {new Date().getFullYear()} slugy.co All rights reserved.
              </p>
            </>
          </div>
        </footer>
      ) : null}
    </>
  );
};

export default Footer;
