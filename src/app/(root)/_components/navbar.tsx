"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import AppLogo from "@/components/web/app-logo";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu";
import { NAV_LINKS } from "@/constants/data/navitems";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import GetStartedButton from "./get-started-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ListItem } from "./list-item";
import { Button } from "@/components/ui/button";

type NavLink = (typeof NAV_LINKS)[number];

const VISIBLE_PATHS = new Set([
  "/",
  "/pricing",
  "/sponsors",
  "/tools",
  "/tools/qr-code-generator",
  "/tools/utm-builder",
]);

function isMarketingChromeVisible(pathname: string) {
  if (VISIBLE_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/tools/")) return true;
  return pathname === "/blogs" || pathname.startsWith("/blogs/");
}

function NavbarLogo() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2"
      aria-label="Go to home page"
    >
      <div className="text-sidebar-primary-foreground flex aspect-square shrink-0 items-center justify-center rounded-lg">
        <AppLogo className="rounded-lg" />
      </div>
      <div className="flex flex-col items-start leading-none">
        <span className="text-xl font-medium tracking-tight">Slugy</span>
      </div>
    </Link>
  );
}

function DesktopSubmenu({ link }: { link: NavLink }) {
  const isFeatures = link.title === "Features";

  return (
    <>
      <NavigationMenuTrigger className="text-muted-foreground hover:text-foreground data-[state=open]:text-foreground h-9 bg-transparent px-3 text-[13px] font-medium transition-colors">
        {link.title}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul
          className={cn(
            "grid gap-0.5",
            isFeatures
              ? "md:w-[480px] lg:w-[520px] lg:grid-cols-[200px_1fr]"
              : "w-[320px] grid-cols-1",
          )}
        >
          {isFeatures && (
            <li className="row-span-3 mr-1.5">
              <NavigationMenuLink asChild>
                <Link
                  href="/#features"
                  className="flex h-full w-full flex-col justify-end gap-3 rounded-lg border border-zinc-200/70 bg-gradient-to-b from-zinc-100 to-white p-3.5 no-underline outline-none select-none focus:shadow-md dark:border-white/10 dark:from-zinc-900 dark:to-zinc-950"
                >
                  <div
                    aria-hidden
                    className="rounded-lg border border-zinc-200/70 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                      <div className="h-1.5 w-8 rounded-full bg-blue-500/70" />
                    </div>
                    <div className="mt-2 flex h-9 items-end gap-1">
                      {[35, 55, 40, 70, 52, 85, 64, 95].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-zinc-900/80 dark:bg-zinc-100/80"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mt-1 mb-0.5 text-[15px] font-medium">
                      All Features
                    </div>
                    <p className="text-muted-foreground text-xs leading-snug">
                      Manage links, track performance, and more.
                    </p>
                  </div>
                </Link>
              </NavigationMenuLink>
            </li>
          )}
          {link.menu?.map((menuItem) => (
            <ListItem
              key={menuItem.title}
              title={menuItem.title}
              href={menuItem.href}
              icon={menuItem.icon}
            >
              {menuItem.tagline}
            </ListItem>
          ))}
        </ul>
      </NavigationMenuContent>
    </>
  );
}

function DesktopMenu() {
  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        {NAV_LINKS.map((link) => (
          <NavigationMenuItem key={link.title}>
            {link.menu ? (
              <DesktopSubmenu link={link} />
            ) : (
              <NavigationMenuLink asChild>
                <Link
                  href={link.href}
                  className={cn(
                    "group hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground text-muted-foreground hover:text-foreground inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-3 py-2 text-[13px] font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {link.title}
                </Link>
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function MobileMenuContent() {
  return (
    <div className="flex flex-col">
      <div className="flex-1 overflow-auto">
        <Accordion type="single" collapsible className="w-full border-none">
          {NAV_LINKS.map((section, i) =>
            section.menu ? (
              <AccordionItem
                className="border-none"
                value={`item-${i}`}
                key={section.title}
              >
                <AccordionTrigger className="border-none px-4 py-3 text-[15px] font-medium">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-0.5 px-2 pb-2">
                    {section.menu.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="hover:bg-accent flex items-center gap-3 rounded-lg px-2 py-2"
                      >
                        {item.icon && (
                          <span className="border-border bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
                            <item.icon className="text-muted-foreground h-4 w-4" />
                          </span>
                        )}
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-foreground text-[13px] font-medium">
                            {item.title}
                          </span>
                          <span className="text-muted-foreground line-clamp-1 text-xs">
                            {item.tagline}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : (
              <div key={section.title} className="px-4 py-3">
                <Link
                  href={section.href}
                  className="block border-none text-[15px] font-medium"
                >
                  {section.title}
                </Link>
              </div>
            ),
          )}
        </Accordion>
      </div>
      <hr className="mx-auto my-4 flex w-[90%] items-center justify-center" />
      <div className="p-4">
        <GetStartedButton
          isGitVisible={false}
          className="grid w-full grid-cols-2"
        />
      </div>
    </div>
  );
}

function MobileMenu() {
  return (
    <div className="flex items-center gap-2 lg:hidden">
      <GetStartedButton
        isGitVisible={true}
        showAuthButtons={false}
        className="flex"
      />
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-full max-w-[400px] bg-white p-0 dark:bg-black"
        >
          <SheetHeader className="p-4">
            <SheetTitle className="flex items-center gap-2">
              <AppLogo />
              <span className="text-lg font-medium">slugy</span>
            </SheetTitle>
          </SheetHeader>
          <MobileMenuContent />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const isVisible = isMarketingChromeVisible(pathname);

  if (!isVisible) return null;

  return (
    <nav className="fixed top-0 left-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-[3.5rem] max-w-6xl items-center justify-between px-4">
        <NavbarLogo />
        <DesktopMenu />
        <GetStartedButton
          isGitVisible={true}
          className="hidden items-center lg:flex"
        />
        <MobileMenu />
      </div>
    </nav>
  );
}
