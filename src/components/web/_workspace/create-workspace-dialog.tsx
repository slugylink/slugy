"use client";
import React, { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/server/actions/workspace/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus } from "lucide-react";
import AppLogo from "../app-logo";

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

export default function CreateWorkspaceDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
    reset,
    formState: { isSubmitting, isValid, isDirty },
  } = form;

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = slugify(name);
    setValue("workspaceslug", slug, { shouldValidate: true });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      reset();
    }
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
        reset();
        setOpen(false);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="hover:bg-accent focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0">
          <div className="bg-background flex size-6 items-center justify-center rounded-md border">
            <Plus className="size-4" />
          </div>
          <div className="text-muted-foreground">Add workspace</div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center justify-center mb-2">
          <DialogTitle className="flex flex-col items-center gap-y-3">
            <AppLogo /> Workspace
          </DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your link.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="workspaceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal mb-1">Workspace Name</FormLabel>
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
                  <FormLabel className="font-normal mb-1">Workspace Slug</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <div className="flex items-center rounded-l-md border border-r-0 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-300">
                        app.slugy.co
                      </div>
                      <Input
                        id="workspace-slug"
                        className="flex-1 rounded-l-none h-full"
                        autoComplete="off"
                        {...field}
                        aria-describedby="workspace-slug-description"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={!isValid || isSubmitting || !isDirty}
              >
                {isSubmitting && (
                  <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
                )}
                Create Workspace
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
