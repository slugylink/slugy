import React from "react";
import Link from "next/link";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

interface ListItemProps extends React.ComponentPropsWithoutRef<"a"> {
  title: string;
  icon: React.ElementType;
}

export const ListItem = React.forwardRef<React.ElementRef<"a">, ListItemProps>(
  ({ className, title, href, icon: Icon, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <Link
            href={href!}
            ref={ref}
            className={cn(
              "hover:bg-accent focus:bg-accent group flex items-start gap-3 rounded-lg p-2.5 leading-none no-underline transition-colors outline-none select-none",
              className,
            )}
            {...props}
          >
            <span className="border-border bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
              <Icon className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-colors" />
            </span>
            <span className="flex min-w-0 flex-col gap-1 text-start">
              <span className="text-[13px] leading-none font-medium">
                {title}
              </span>
              <span className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                {children}
              </span>
            </span>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  },
);

ListItem.displayName = "ListItem";
