"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import AppLogo from "@/components/web/app-logo";
import { usePathname } from "next/navigation";

interface FooterLinkProps {
  href: string;
  children: ReactNode;
}

const FooterLink = ({ href, children }: FooterLinkProps) => (
    <li className="mt-2">
      <Link
        href={href || "#"}
        className="hover:text-foreground transition-colors duration-300"
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
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

const FooterSection = ({ title, links }: FooterSectionProps) => (
  <section
    className="mt-10 flex flex-col md:mt-0"
    aria-labelledby={`footer-section-${title}`}
  >
    <h3 id={`footer-section-${title}`} className="text-base font-medium">
      {title}
    </h3>
    <ul className="text-muted-foreground mt-4 text-sm">
      {links.map((link) => (
        <FooterLink key={link.href || link.label} href={link.href}>
          {link.label}
        </FooterLink>
      ))}
    </ul>
  </section>
);

const Footer = () => {
  const footerSections: FooterSectionProps[] = [
    {
      title: "Product",
      links: [
        { href: "#features", label: "Features" },
      ],
    },
    {
      title: "About",
      links: [
        { href: "/about", label: "About Us" },
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms & Conditions" },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "/sponsors", label: "Sponsors" },
        { href: "/resources/blog", label: "Blog" },
        { href: "/resources/help", label: "Help" },
      ],
    },
    {
      title: "Connect",
      links: [
        { href: "https://x.com/slugydotco", label: "Twitter" },
        {
          href: "https://www.linkedin.com/in/sarkar-sandip/",
          label: "LinkedIn",
        },
      ],
    },
  ];

  const pathname = usePathname();

  if (!["/", "/tools/metadatas", "/pricing", '/sponsors'].includes(pathname)) {
    return null;
  }

  return (
    <footer className="border-border relative mx-auto mt-24 flex w-full max-w-6xl flex-col items-center justify-center border-t bg-transparent bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-4 pt-16 pb-8 md:mt-40 md:pb-0 lg:px-4 lg:pt-24">
      <div className="bg-foreground absolute top-0 right-1/2 left-1/2 h-1.5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <div className="flex flex-col items-start justify-start md:max-w-[300px]">
          <AppLogo />
          <p className="text-muted-foreground mt-4 text-start text-sm">
            Simplify Links Like Magic!
          </p>
        </div>
        <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
          <div className="md:grid md:grid-cols-2 md:gap-8">
            {footerSections.slice(0, 2).map((section) => (
              <FooterSection key={section.title} {...section} />
            ))}
          </div>
          <div className="md:grid md:grid-cols-2 md:gap-8">
            {footerSections.slice(2, 4).map((section) => (
              <FooterSection key={section.title} {...section} />
            ))}
          </div>
        </div>
      </div>
      <div className="border-border/40 mt-8 w-full border-t pt-4 md:flex md:items-center md:justify-between md:py-4">
        <p className="text-muted-foreground mt-4 text-sm md:mt-0">
          &copy; {new Date().getFullYear()} slugy.co All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
