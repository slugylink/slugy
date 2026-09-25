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
              "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none",
              className,
            )}
            {...props}
          >
            <div className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-4 max-w-4 min-w-4" />
              <div className="flex flex-col items-start gap-1.5 text-start text-sm leading-none font-normal">
                <span className="font-medium">{title}</span>
                <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                  {children}
                </p>
              </div>
            </div>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  },
);

ListItem.displayName = "ListItem";
