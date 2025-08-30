"use client";
import React, { memo } from "react";
import useSWR from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { Crown, User } from "lucide-react";

// Types based on API response
interface TeamMember {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  role: "owner" | "admin" | "member";
}

interface TeamClientProps {
  workspaceslug: string;
  currentUserId: string;
}

const TeamClient: React.FC<TeamClientProps> = memo(
  ({ workspaceslug, currentUserId }) => {
    // Fetch team data
    const {
      data: team,
      error,
      isLoading,
    } = useSWR<TeamMember[]>(
      `/api/workspace/${workspaceslug}/team`,
      async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch team data");
        }
        return response.json();
      },
    );

    return (
      <div className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">
              View your team members and their roles
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center">
                  <div className="flex items-center justify-center">
                    <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-muted-foreground">Failed to load team members</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : !team || team.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <User className="text-muted-foreground mb-2 h-8 w-8" />
                    <p className="text-muted-foreground">No team members found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              team.map((member) => {
                const isCurrentUser = member.user.id === currentUserId;
                const isOwner = member.role === "owner";

                return (
                  <TableRow key={member.user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {member.user.image ? (
                          <Image
                            src={member.user.image}
                            alt={member.user.name || "Member"}
                            width={30}
                            height={30}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                            <User className="text-muted-foreground h-4 w-4" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {member.user.name || "Unnamed User"}
                            </span>
                            {isOwner && (
                              <Crown className="h-4 w-4 text-amber-500" />
                            )}
                            {isCurrentUser && (
                              <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {member.user.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium capitalize">
                        {member.role}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  },
);

TeamClient.displayName = "TeamClient";

export default TeamClient;
