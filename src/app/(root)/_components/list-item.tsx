import React from "react"
import Link from "next/link"
import { NavigationMenuLink } from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

interface ListItemProps extends React.ComponentPropsWithoutRef<"a"> {
  title: string
  icon: React.ElementType
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
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              className,
            )}
            {...props}
          >
            <div className="flex items-start gap-2">
              <Icon className="h-4 min-w-4 max-w-4" />
              <div className="flex flex-col items-start gap-2 text-start text-sm font-normal leading-none">
                <span>{title}</span>
                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
              </div>
            </div>
          </Link>
        </NavigationMenuLink>
      </li>
    )
  },
)

ListItem.displayName = "ListItem"

