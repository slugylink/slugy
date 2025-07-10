"use client";
import React, { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/server/actions/workspace/workspace";
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

// Form Schema
const formSchema = z.object({
  workspaceName: z
    .string()
    .min(1, { message: "Workspace name is required" })
    .max(30, { message: "Workspace name cannot exceed 30 characters" }),
  workspaceslug: z
    .string()
    .min(1, { message: "Workspace slug is required" })
    .max(30, { message: "Workspace slug cannot exceed 30 characters" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and can include hyphens",
    }),
  isDefault: z.boolean(),
});

export default function CreateWorkspace() {
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceName: "",
      workspaceslug: "",
      isDefault: true,
    },
  });

  const {
    setValue,
    formState: { isSubmitting, isValid, isDirty },
  } = form;

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = slugify(name);
    setValue("workspaceslug", slug, { shouldValidate: true });
  };

  async function onSubmit(data: FormData) {
    try {
      const res = await createWorkspace({
        name: data.workspaceName,
        slug: data.workspaceslug,
        isDefault: data.isDefault,
      });

      if (res.success) {
        toast.success("Workspace created successfully!");
        form.reset();
        router.push(`/${res.slug}`);
      } else {
        const errorMessage = res.error || "Failed to create workspace";

        if (res.slugExists) {
          toast.error("Workspace slug is already taken.");
          // Focus on the slug field for better UX
          form.setFocus("workspaceslug");
        } else if (res.limitInfo) {
          toast.error(errorMessage);
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error creating workspace:", error);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="mx-auto w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center space-y-6">
          <AppLogo />
          <div className="flex flex-col items-center space-y-2">
            <h2 className="text-xl font-medium text-zinc-800 dark:text-white">
              Create a workspace
            </h2>
            <p className="text-center text-zinc-600 dark:text-zinc-300">
              Let&apos;s set up your workspace
            </p>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="workspaceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Workspace Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme, Inc."
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
              name="workspaceslug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Workspace Slug</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <div className="flex items-center rounded-l-md border border-r-0 px-3 py-1 text-sm text-zinc-500 dark:text-zinc-300">
                        app.slugy.co
                      </div>
                      <Input
                        id="workspace-slug"
                        className="flex-1 rounded-l-none"
                        autoComplete="off"
                        {...field}
                        aria-describedby="workspace-slug-description"
                      />
                    </div>
                  </FormControl>
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
              Create workspace
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
