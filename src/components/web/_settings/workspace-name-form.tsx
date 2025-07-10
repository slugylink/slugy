"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import axios from "axios";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";

// Define the validation schema with Zod
const formSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(32, "Max 32 characters"),
});

interface WorkspaceNameFormProps {
  initialData: {
    id: string;
    name: string;
    slug: string;
  };
  userId: string;
  workspaceslug: string;
}

// Define the form's data type
type FormValues = z.infer<typeof formSchema>;

const WorkspaceNameForm = ({
  initialData,
  workspaceslug,
}: WorkspaceNameFormProps) => {
  const router = useRouter();

  // Initialize the form with React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData.name || "",
    },
  });

  const {
    formState: { isSubmitting, isValid },
  } = form;

  const onSubmit = async (data: FormValues) => {
    try {
      await axios.patch(`/api/workspace/${workspaceslug}/settings`, data);
      toast.success("Workspace name updated successfully.");
      router.refresh(); // Refresh page or data after submission
    } catch (error) {
      console.error("Error updating workspace name:", error);
      toast.error("Failed to update workspace name. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 rounded-xl border p-5 shadow-none"
      >
        <div className="space-y-3">
          <FormLabel className="mb-4" htmlFor="name">Workspace Name</FormLabel>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} id="name" placeholder="Project One" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-muted-foreground text-sm">Max 32 characters</p>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            type="submit"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting && (
              <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
            )}{" "}
            <span>Save Changes</span>
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkspaceNameForm;
