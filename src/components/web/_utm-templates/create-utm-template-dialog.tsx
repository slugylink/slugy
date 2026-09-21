"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { mutate } from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { UTM_FIELDS, type UtmTemplate } from "@/constants/utm-fields";

const formSchema = z.object({
  name: z.string().min(1, { message: "Template name is required" }).max(40),
  source: z.string().max(255).optional(),
  medium: z.string().max(255).optional(),
  campaign: z.string().max(255).optional(),
  term: z.string().max(255).optional(),
  content: z.string().max(255).optional(),
  referral: z.string().max(255).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UtmTemplateFormProps {
  workspaceslug: string;
  initialData?: UtmTemplate;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const emptyValues: FormData = {
  name: "",
  source: "",
  medium: "",
  campaign: "",
  term: "",
  content: "",
  referral: "",
};

const UtmTemplateForm = ({
  workspaceslug,
  initialData,
  open: controlledOpen,
  onOpenChange,
}: UtmTemplateFormProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues,
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
    reset,
  } = form;

  useEffect(() => {
    if (open) {
      reset(
        initialData
          ? {
              name: initialData.name,
              source: initialData.utm_source ?? "",
              medium: initialData.utm_medium ?? "",
              campaign: initialData.utm_campaign ?? "",
              term: initialData.utm_term ?? "",
              content: initialData.utm_content ?? "",
              referral: initialData.referral ?? "",
            }
          : emptyValues,
      );
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (initialData) {
        const response = await axios.patch(
          `/api/workspace/${workspaceslug}/utm-templates/${initialData.id}`,
          data,
        );
        if (response.status === 200) {
          toast.success("Template updated successfully!");
          await mutate(`/api/workspace/${workspaceslug}/utm-templates`);
          setOpen(false);
        }
      } else {
        const response = await axios.post(
          `/api/workspace/${workspaceslug}/utm-templates`,
          data,
        );
        if (response.status === 201) {
          toast.success("Template created successfully!");
          await mutate(`/api/workspace/${workspaceslug}/utm-templates`);
          setOpen(false);
        }
      }
      reset(emptyValues);
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response) {
        const data = error.response.data as { error?: string };
        toast.error(
          data?.error ??
            `Error ${initialData ? "updating" : "creating"} template. Please try again.`,
        );
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset(emptyValues);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!initialData && (
        <DialogTrigger asChild>
          <Button className="flex items-center justify-center gap-x-2">
            <Plus size={17} />
            <span className="hidden sm:inline">Create template</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="px-4 sm:max-w-[425px]">
        <DialogHeader className="mb-4">
          <DialogTitle>
            {initialData ? "Edit UTM Template" : "Create UTM Template"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="template-name">Template Name</FormLabel>
                  <FormControl>
                    <Input
                      id="template-name"
                      placeholder="New Template"
                      autoFocus
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <span className="text-sm font-medium">Parameters</span>
              <div className="grid gap-2">
                {UTM_FIELDS.map(({ key, label, placeholder, icon: Icon }) => (
                  <FormField
                    key={key}
                    control={control}
                    name={key}
                    render={({ field }) => (
                      <FormItem className="gap-0">
                        <FormControl>
                          <div className="focus-within:ring-ring flex items-center overflow-hidden rounded-lg border focus-within:ring-1">
                            <div className="text-muted-foreground flex w-[120px] shrink-0 items-center gap-2 border-r px-3 py-2 text-sm">
                              <Icon className="h-4 w-4" />
                              <span>{label}</span>
                            </div>
                            <Input
                              placeholder={placeholder}
                              className="h-9 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialData ? "Save changes" : "Create template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UtmTemplateForm;
