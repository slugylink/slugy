"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { redirect, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { createAuthClient } from "better-auth/react";
const { useSession } = createAuthClient();

interface User {
  name: string;
  email: string;
  image: string;
}

type MenuItem = {
  color?: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string | URL;
};

type MenuGroup = {
  group: string;
  items: MenuItem[];
};

export function ProfileDropdown() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) return loadingSkeleton;

  if (!session) return redirect("/login");

  const userProps: User = {
    name: session.user.name ?? "Anonymous",
    email: session.user.email ?? "",
    image: session.user.image ?? "",
  };

  const menuItems: MenuGroup[] = [
    {
      group: "actions",
      items: [
        {
          color: "", // Added custom red text classes
          icon: <LogOut className="mr-2 size-4" />,
          label: "Log out",
          onClick: async () => {
            await authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push("/login"); // redirect to login page
                  router.refresh();
                },
              },
            });
          },
        },
      ],
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage
              onLoad={(e) => e.currentTarget.classList.remove("blur-[2px]")}
              src={userProps?.image ?? undefined}
              alt={userProps?.name ?? undefined}
              className="blur-[2px]"
            />
            <AvatarFallback className="rounded-lg">
              {userProps?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="z-50 w-56 rounded-lg"
        align="end"
        sideOffset={4}
        side="bottom"
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={userProps.image} alt={userProps.name} />
              <AvatarFallback className="rounded-lg">
                {userProps?.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{userProps.name}</span>
              <span className="truncate text-xs">{userProps.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {menuItems.map((group, index) => (
            <React.Fragment key={group.group}>
              {index > 0 && <DropdownMenuSeparator />}
              {group.items.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  className={`cursor-pointer ${item.color ?? ""}`}
                  onClick={item.onClick}
                >
                  {item.icon}
                  {item.label}
                </DropdownMenuItem>
              ))}
            </React.Fragment>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const loadingSkeleton = (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-8 w-8 p-0">
        <Skeleton className="h-8 w-8 rounded-lg" />
      </Button>
    </DropdownMenuTrigger>
  </DropdownMenu>
);
