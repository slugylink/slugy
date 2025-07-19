"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { inviteMember, getOrganizations } from "@/server/actions/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormControl,
  FormMessage,
  FormLabel,
  FormItem,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import AppLogo from "@/components/web/app-logo";

type FormData = z.infer<typeof formSchema>;

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

// Form Schema
const formSchema = z.object({
  organizationId: z.string().min(1, { message: "Please select an organization" }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .min(1, { message: "Email is required" }),
  role: z.enum(["admin", "member", "owner"], {
    required_error: "Please select a role",
  }),
});

const roleOptions = [
  {
    value: "owner",
    label: "Owner",
    description: "Full access to organization settings and members",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Can manage organization settings and members",
  },
  {
    value: "member",
    label: "Member",
    description: "Can create and manage workspaces",
  },
];

export default function SendInvitation() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationId: "",
      email: "",
      role: "member",
    },
  });

  const {
    formState: { isSubmitting, isValid, isDirty },
  } = form;

  // Load user's organizations
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const result = await getOrganizations();
      if (result.success) {
        const orgs = (result.organizations || []).filter(Boolean) as Organization[];
        setOrganizations(orgs);
      } else {
        toast.error(result.error || "Failed to load organizations");
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  async function onSubmit(data: FormData) {
    try {
      const result = await inviteMember({
        email: data.email,
        role: data.role,
        organizationId: data.organizationId,
      });

      if (result.success) {
        toast.success("Invitation sent successfully!");
        form.reset();
        // Optionally redirect back to organization page
        // router.push("/dashboard");
      } else {
        toast.error(result.error || "Failed to send invitation");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error sending invitation:", error);
    }
  }

  if (isLoadingOrgs) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <p className="text-zinc-600 dark:text-zinc-300">Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="mx-auto w-full max-w-md p-8 text-center">
          <AppLogo />
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-medium text-zinc-800 dark:text-white">
              No Organizations Found
            </h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              You need to be a member of an organization to send invitations.
            </p>
            <Button onClick={() => router.push("/test")}>
              Create Organization
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="mx-auto w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center space-y-6">
          <AppLogo />
          <div className="flex flex-col items-center space-y-2">
            <h2 className="text-xl font-medium text-zinc-800 dark:text-white">
              Invite Team Member
            </h2>
            <p className="text-center text-zinc-600 dark:text-zinc-300">
              Send an invitation to join your organization
            </p>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Organization</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="colleague@example.com"
                      {...field}
                      disabled={isSubmitting}
                      autoComplete="email"
                      type="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{role.label}</span>
                            <span className="text-muted-foreground text-xs">
                              {role.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={!isValid || isSubmitting || !isDirty}
              >
                {isSubmitting && (
                  <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
                )}
                Send Invitation
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>

        <div className="mt-6 rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            What happens next?
          </h3>
          <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            <li>• An invitation email will be sent to the provided address</li>
            <li>• The invitation will expire in 7 days</li>
            <li>
              • Once accepted, the user will be added to your organization
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
