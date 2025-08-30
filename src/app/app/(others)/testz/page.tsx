"use client";
import React, { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganization } from "@/server/actions/organization";
import { authClient } from "@/lib/auth-client";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import slugify from "@sindresorhus/slugify";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import AppLogo from "@/components/web/app-logo";

type FormData = z.infer<typeof formSchema>;

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}

// Form Schema
const formSchema = z.object({
  organizationName: z
    .string()
    .min(1, { message: "Organization name is required" })
    .max(50, { message: "Organization name cannot exceed 50 characters" }),
  organizationSlug: z
    .string()
    .min(1, { message: "Organization slug is required" })
    .max(30, { message: "Organization slug cannot exceed 30 characters" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and can include hyphens",
    }),
  logo: z
    .string()
    .url({ message: "Please enter a valid URL" })
    .optional()
    .or(z.literal("")),
});

export default function CreateOrganization() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: "",
      organizationSlug: "",
      logo: "",
    },
  });

  const {
    setValue,
    formState: { isSubmitting, isValid, isDirty },
  } = form;

  // Load existing organizations
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      // Try to get organizations - this might not be available in all versions
      const result = await authClient.organization.list();
      if ("error" in result) {
        console.error("Error loading organizations:", result.error);
        setOrganizations([]);
      } else {
        // Handle different possible result structures
        const orgs = Array.isArray(result) ? result : (result as { data?: Organization[] })?.data || [];
        setOrganizations(orgs);
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
      setOrganizations([]);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = slugify(name);
    setValue("organizationSlug", slug, { shouldValidate: true });
  };

  async function onSubmit(data: FormData) {
    try {
      const organizationData = {
        name: data.organizationName,
        slug: data.organizationSlug,
        ...(data.logo && { logo: data.logo }),
      };

      const result = await createOrganization(organizationData);

      if (result.success) {
        toast.success("Organization created successfully!");
        form.reset();
        // Reload organizations list
        await loadOrganizations();
        // Redirect to the organization workspace
        if (result.organization) {
          router.push(`/${result.organization.slug}-workspace`);
        } else {
          router.push("/dashboard");
        }
      } else {
        const errorMessage = result.error || "Failed to create organization";
        
        if (result.slugExists) {
          toast.error("Organization slug is already taken.");
          // Focus on the slug field for better UX
          form.setFocus("organizationSlug");
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error creating organization:", error);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="mx-auto w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center space-y-6">
          <AppLogo />
          <div className="flex flex-col items-center space-y-2">
            <h2 className="text-xl font-medium text-zinc-800 dark:text-white">
              Create an organization
            </h2>
            <p className="text-center text-zinc-600 dark:text-zinc-300">
              Set up your organization to collaborate with your team
            </p>
          </div>
        </div>

        {/* Debug: Show existing organizations */}
        <div className="mb-6 rounded-md bg-gray-50 p-4 dark:bg-gray-900/20">
          <h3 className="text-sm font-medium mb-2">Existing Organizations:</h3>
          {isLoadingOrgs ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : organizations.length > 0 ? (
            <ul className="text-sm text-gray-600 space-y-1">
              {organizations.map((org, index) => (
                <li key={index}>
                  {org.name} (ID: {org.id}, Slug: {org.slug})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No organizations found</p>
          )}
          <Button
            onClick={loadOrganizations}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Refresh
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">
                    Organization Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme Corporation"
                      {...field}
                      disabled={isSubmitting}
                      autoComplete="off"
                      onChange={(e) => {
                        field.onChange(e);
                        handleNameChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizationSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">
                    Organization Slug
                  </FormLabel>
                  <FormControl>
                    <div className="flex">
                      <div className="flex items-center rounded-l-md border border-r-0 px-3 py-1 text-sm text-zinc-500 dark:text-zinc-300">
                        app.slugy.co/org/
                      </div>
                      <Input
                        id="organization-slug"
                        className="flex-1 rounded-l-none"
                        autoComplete="off"
                        {...field}
                        aria-describedby="organization-slug-description"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">
                    Logo URL (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/logo.png"
                      {...field}
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isSubmitting || !isDirty}
            >
              {isSubmitting && (
                <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
              )}
              Create organization
            </Button>

            {/* Test button to try better-auth plugin directly */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const result = await authClient.organization.create({
                    name: "Test Organization",
                    slug: "test-org",
                    logo: "https://example.com/logo.png",
                  });
                  console.log("Better-auth create result:", result);
                  if ("error" in result) {
                    toast.error(result.error?.message || "Failed to create organization");
                  } else {
                    toast.success("Organization created via plugin!");
                    await loadOrganizations();
                  }
                } catch (error) {
                  console.error("Error creating organization via plugin:", error);
                  toast.error("Failed to create organization via plugin");
                }
              }}
            >
              Test: Create via Plugin
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
