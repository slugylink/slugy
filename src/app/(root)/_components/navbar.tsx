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
import { Session } from "@/lib/auth";

type NavLink = (typeof NAV_LINKS)[number];

const VISIBLE_PATHS = ["/", "/tools/metadatas", "/pricing", "/sponsors"];

interface NavbarProps {
  session: Session | null;
}

// Logo component
function NavbarLogo() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5"
      aria-label="Go to home page"
    >
      <div className="text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
        <AppLogo />
      </div>
      <div className="flex flex-col items-start leading-none">
        <span className="text-md font-medium tracking-tight">Slugy</span>
        <span className="mt-0.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
          beta
        </span>
      </div>
    </Link>
  );
}

// Desktop submenu with dropdown
function DesktopSubmenu({ link }: { link: NavLink }) {
  const isFeatures = link.title === "Features";

  return (
    <>
      <NavigationMenuTrigger className="bg-transparent font-normal">
        {link.title}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul
          className={cn(
            "grid gap-3 p-0 md:w-[400px] lg:w-[500px]",
            isFeatures ? "lg:grid-cols-[.75fr_1fr]" : "lg:grid-cols-2",
          )}
        >
          {isFeatures && (
            <li className="row-span-4">
              <NavigationMenuLink asChild>
                <Link
                  href="/"
                  className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b p-3 no-underline outline-none select-none focus:shadow-md"
                >
                  <div className="mt-4 mb-2 text-lg font-medium">
                    All Features
                  </div>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Manage links, track performance, and more.
                  </p>
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

// Desktop navigation menu
function DesktopMenu() {
  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        {NAV_LINKS.map((link) => (
          <NavigationMenuItem key={link.title}>
            {link.menu ? (
              <DesktopSubmenu link={link} />
            ) : (
              <Link href={link.href} legacyBehavior passHref>
                <NavigationMenuLink
                  className={cn(
                    "group hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-normal transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {link.title}
                </NavigationMenuLink>
              </Link>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

// Mobile menu content
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
                <AccordionTrigger className="border-none px-4 text-base font-medium">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col space-y-2 pb-2">
                    {section.menu.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="text-muted-foreground hover:text-primary flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">
                            {item.title}
                          </span>
                          <span className="text-xs">{item.tagline}</span>
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
                  className="block border-none text-base font-medium"
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
        <GetStartedButton isGitVisible={false} className="flex w-full" />
      </div>
    </div>
  );
}

// Mobile menu with sheet
function MobileMenu({ session }: { session: Session | null }) {
  return (
    <div className="flex items-center gap-2">
      <GetStartedButton isGitVisible={true} className="flex" />
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

// Main navbar component
export default function Navbar({ session }: NavbarProps) {
  const pathname = usePathname();
  const isVisible = VISIBLE_PATHS.includes(pathname);

  if (!isVisible) return null;

  return (
    <nav className="fixed top-0 left-0 z-50 w-full border-b border-zinc-200 bg-white backdrop-blur-md dark:border-white/10">
      <div className="mx-auto flex h-[3.5rem] max-w-6xl items-center justify-between px-4">
        <NavbarLogo />
        <DesktopMenu />
        <MobileMenu session={session} />
      </div>
    </nav>
  );
}
