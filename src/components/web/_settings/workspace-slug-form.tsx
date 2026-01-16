"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "sonner";
import slugify from "@sindresorhus/slugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoaderCircle } from "@/utils/icons/loader-circle";

const formSchema = z.object({
  slug: z
    .string()
    .min(1, "Workspace slug is required")
    .max(20, "Max 20 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and can include hyphens",
    }),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkspaceSlugFormProps {
  initialData: {
    id: string;
    slug: string;
  };
  workspaceslug: string;
}

const WorkspaceSlugForm = ({
  initialData,
  workspaceslug,
}: WorkspaceSlugFormProps) => {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: initialData.slug || "",
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting, isValid, isDirty },
  } = form;

  const onSubmit = async (data: FormValues) => {
    try {
      const slug = slugify(data.slug);
      await axios.patch<{ slug: string }>(
        `/api/workspace/${workspaceslug}/settings`,
        { slug },
      );
      toast.success("Workspace slug updated successfully.");
      router.refresh();
      router.push(`/${slug}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          toast.error("Slug already exists.");
        } else if (error.response?.status === 401) {
          toast.error("You are not authorized.");
        } else {
          toast.error("Error updating workspace. Please try again.");
        }
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-xl border p-5 shadow-none"
      >
        <div className="space-y-3">
          <FormLabel htmlFor="slug">Workspace Slug</FormLabel>
          <FormField
            control={control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    id="slug"
                    placeholder="project-one"
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-muted-foreground text-sm">
            Only lowercase letters, numbers, and hyphens. Max 20 characters
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            type="submit"
            disabled={!isValid || isSubmitting || !isDirty}
          >
            {isSubmitting && (
              <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
            )}
            <span>Save Changes</span>
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkspaceSlugForm;
