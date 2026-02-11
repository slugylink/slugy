"use client";

import { memo, useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import Image from "next/image";
import {
  Crown,
  Mail,
  MoreVertical,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Types
// ============================================================================

type WorkspaceRole = "owner" | "admin" | "member";

interface TeamMember {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  role: WorkspaceRole;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  expiresAt: string;
  invitedAt: string;
}

interface TeamResponse {
  members: TeamMember[];
  invitations: PendingInvitation[];
  isOwner?: boolean;
  canManageTeam?: boolean;
  role?: WorkspaceRole;
}

interface TeamClientProps {
  workspaceslug: string;
  currentUserId: string;
}

// ============================================================================
// API Utilities
// ============================================================================

async function apiCall<T>(
  url: string,
  options?: RequestInit,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return res.ok
      ? { ok: true, data: data as T }
      : { ok: false, error: data.error ?? "Request failed" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function fetchTeamData(url: string): Promise<TeamResponse> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch team data");
  return response.json();
}

// ============================================================================
// Table State Components
// ============================================================================

const EmptyState = memo(({ colSpan }: { colSpan: number }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="h-32 text-center">
      <div className="flex flex-col items-center justify-center">
        <p className="text-muted-foreground">No team members found</p>
      </div>
    </TableCell>
  </TableRow>
));
EmptyState.displayName = "EmptyState";

const LoadingState = memo(({ colSpan }: { colSpan: number }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="h-32 text-center">
      <div className="flex items-center justify-center">
        <LoaderCircle className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    </TableCell>
  </TableRow>
));
LoadingState.displayName = "LoadingState";

const ErrorState = memo(({ colSpan }: { colSpan: number }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="h-32 text-center">
      <div className="flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Failed to load team members</p>
      </div>
    </TableCell>
  </TableRow>
));
ErrorState.displayName = "ErrorState";

// ============================================================================
// Member Row Component
// ============================================================================

interface MemberRowProps {
  member: TeamMember;
  canManageTeam: boolean;
  currentUserId: string;
  onRoleChange: (memberId: string, role: "admin" | "member") => void;
  onRemoveClick: (member: TeamMember) => void;
  isSubmitting: boolean;
}

const MemberRow = memo(
  ({
    member,
    canManageTeam,
    currentUserId,
    onRoleChange,
    onRemoveClick,
    isSubmitting,
  }: MemberRowProps) => {
    const isCurrentUser = member.user.id === currentUserId;
    const isMemberOwner = member.role === "owner";
    const canManage = canManageTeam && !isCurrentUser && !isMemberOwner;

    return (
      <TableRow>
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
                {isMemberOwner && (
                  <span title="Owner">
                    <Crown className="h-4 w-4 text-amber-500" />
                  </span>
                )}
                {isCurrentUser && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
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
          <span className="text-sm font-medium capitalize">{member.role}</span>
        </TableCell>
        <TableCell>
          <Badge variant="secondary">Active</Badge>
        </TableCell>
        {canManageTeam && (
          <TableCell>
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onRoleChange(member.user.id, "admin")}
                    disabled={isSubmitting || member.role === "admin"}
                  >
                    Set as Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRoleChange(member.user.id, "member")}
                    disabled={isSubmitting || member.role === "member"}
                  >
                    Set as Member
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onRemoveClick(member)}
                    disabled={isSubmitting}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </TableCell>
        )}
      </TableRow>
    );
  },
);
MemberRow.displayName = "MemberRow";

// ============================================================================
// Invitation Row Component
// ============================================================================

const InvitationRow = memo(
  ({
    invitation,
    canManageTeam,
  }: {
    invitation: PendingInvitation;
    canManageTeam: boolean;
  }) => (
    <TableRow className="bg-muted/30">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
            <Mail className="text-muted-foreground h-4 w-4" />
          </div>
          <span className="text-muted-foreground text-sm">—</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground text-sm">
          {invitation.email}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm font-medium capitalize">
          {invitation.role}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant="outline">Pending</Badge>
      </TableCell>
      {canManageTeam && <TableCell />}
    </TableRow>
  ),
);
InvitationRow.displayName = "InvitationRow";

// ============================================================================
// Remove Member Dialog
// ============================================================================

interface RemoveMemberDialogProps {
  open: boolean;
  member: TeamMember | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (memberId: string) => void;
}

const RemoveMemberDialog = memo(
  ({
    open,
    member,
    isSubmitting,
    onClose,
    onConfirm,
  }: RemoveMemberDialogProps) => {
    if (!open || !member) return null;

    return (
      <div
        className="animate-in fade-in-0 fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm duration-150"
        onClick={() => !isSubmitting && onClose()}
      >
        <div
          className="bg-background animate-in fade-in-0 zoom-in-95 w-full max-w-md rounded-xl border p-6 shadow-lg duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 space-y-2">
            <h2 className="text-lg font-semibold">Remove member</h2>
            <p className="text-muted-foreground text-sm">
              Are you sure you want to remove{" "}
              <strong>{member.user.name || member.user.email}</strong> from this
              workspace? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(member.user.id)}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </div>
        </div>
      </div>
    );
  },
);
RemoveMemberDialog.displayName = "RemoveMemberDialog";

// ============================================================================
// Main Component
// ============================================================================

const TeamClient = memo(({ workspaceslug, currentUserId }: TeamClientProps) => {
  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Remove dialog state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Fetch team data
  const {
    data: teamData,
    error,
    isLoading,
    mutate,
  } = useSWR<TeamResponse>(
    `/api/workspace/${workspaceslug}/team`,
    fetchTeamData,
  );

  // Derived state
  const members = teamData?.members ?? [];
  const invitations = teamData?.invitations ?? [];
  const canManageTeam = teamData?.canManageTeam ?? false;
  const hasAny = members.length > 0 || invitations.length > 0;
  const colSpan = useMemo(() => (canManageTeam ? 5 : 4), [canManageTeam]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleRoleChange = useCallback(
    async (memberId: string, newRole: "admin" | "member") => {
      setActionSubmitting(true);
      try {
        const result = await apiCall(
          `/api/workspace/${workspaceslug}/team/${memberId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          },
        );
        if (!result.ok) {
          toast.error(result.error ?? "Failed to update role");
          return;
        }
        toast.success("Role updated");
        mutate();
      } finally {
        setActionSubmitting(false);
      }
    },
    [workspaceslug, mutate],
  );

  const handleRemove = useCallback(
    async (memberId: string) => {
      setActionSubmitting(true);
      try {
        const result = await apiCall(
          `/api/workspace/${workspaceslug}/team/${memberId}`,
          {
            method: "DELETE",
          },
        );
        if (!result.ok) {
          toast.error(result.error ?? "Failed to remove member");
          return;
        }
        toast.success("Member removed");
        setRemoveDialogOpen(false);
        setSelectedMember(null);
        mutate();
      } finally {
        setActionSubmitting(false);
      }
    },
    [workspaceslug, mutate],
  );

  const handleInviteSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const email = inviteEmail.trim().toLowerCase();
      if (!email) {
        toast.error("Please enter an email address");
        return;
      }
      setInviteSubmitting(true);
      try {
        const result = await apiCall(
          `/api/workspace/${workspaceslug}/team/invite`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role: inviteRole }),
          },
        );
        if (!result.ok) {
          toast.error(result.error ?? "Failed to send invitation");
          return;
        }
        toast.success("Invitation sent");
        setInviteOpen(false);
        setInviteEmail("");
        setInviteRole("member");
        mutate();
      } finally {
        setInviteSubmitting(false);
      }
    },
    [workspaceslug, inviteEmail, inviteRole, mutate],
  );

  const handleRemoveClick = useCallback((member: TeamMember) => {
    setSelectedMember(member);
    setRemoveDialogOpen(true);
  }, []);

  const handleRemoveDialogClose = useCallback(() => {
    setRemoveDialogOpen(false);
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="mt-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            View your team members and their roles
          </p>
        </div>
        {canManageTeam && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite by email</DialogTitle>
                <DialogDescription>
                  Send an invitation to join this workspace. They will receive
                  an email with a link to accept.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={inviteSubmitting}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) =>
                      setInviteRole(v as "member" | "admin")
                    }
                    disabled={inviteSubmitting}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteOpen(false)}
                    disabled={inviteSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteSubmitting}>
                    {inviteSubmitting && (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send invitation
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            {canManageTeam && <TableHead className="w-[50px]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingState colSpan={colSpan} />
          ) : error ? (
            <ErrorState colSpan={colSpan} />
          ) : !hasAny ? (
            <EmptyState colSpan={colSpan} />
          ) : (
            <>
              {members.map((member) => (
                <MemberRow
                  key={member.user.id}
                  member={member}
                  canManageTeam={canManageTeam}
                  currentUserId={currentUserId}
                  onRoleChange={handleRoleChange}
                  onRemoveClick={handleRemoveClick}
                  isSubmitting={actionSubmitting}
                />
              ))}
              {invitations.map((inv) => (
                <InvitationRow
                  key={inv.id}
                  invitation={inv}
                  canManageTeam={canManageTeam}
                />
              ))}
            </>
          )}
        </TableBody>
      </Table>

      {/* Remove Member Dialog */}
      <RemoveMemberDialog
        open={removeDialogOpen}
        member={selectedMember}
        isSubmitting={actionSubmitting}
        onClose={handleRemoveDialogClose}
        onConfirm={handleRemove}
      />
    </div>
  );
});

TeamClient.displayName = "TeamClient";

export default TeamClient;
