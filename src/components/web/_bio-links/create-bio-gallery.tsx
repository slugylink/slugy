"use client";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const usernameSchema = z.object({
  username: z
    .string()
    .min(1, { message: "Username is required" })
    .max(25, { message: "Username must be at most 25 characters" })
    .regex(/^[a-z0-9-]+$/, {
      message: "Only lowercase letters, numbers, and hyphens are allowed.",
    }),
});

type UsernameForm = z.infer<typeof usernameSchema>;

export default function CreateBioGallery() {
  const router = useRouter();
  const form = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: "",
    },
  });

  const {
    formState: { isSubmitting, isValid, isDirty },
  } = form;

  async function onSubmit(data: UsernameForm) {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Gallery created!");
      router.push(`/bio-links/${data.username}`);
    } catch (err) {
      toast.error("Failed to create gallery. Please try again.");
    }
  }

  return (
    <div className="flex min-h-[90vh] w-full items-center justify-center">
      <div className="mx-auto w-full max-w-md p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex">
                      <div className="flex items-center rounded-l-md border border-r-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-300">
                        bio.slugy.co
                      </div>
                      <Input
                        id="bio-username"
                        className="h-full flex-1 rounded-l-none"
                        autoComplete="off"
                        maxLength={32}
                        placeholder="Enter a username"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <div className="text-muted-foreground mt-1 text-xs">
                    This will be your gallery URL. Only lowercase letters,
                    numbers, and hyphens are allowed.
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isSubmitting || !isDirty}
            >
              {isSubmitting ? "Creating..." : "Create Bio Gallery"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
