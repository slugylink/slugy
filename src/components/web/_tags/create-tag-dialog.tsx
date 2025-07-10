"use client";
import React, { useState, useEffect } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mutate } from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { COLOR_OPTIONS } from "@/constants/tag-colors";

import AppLogo from "../app-logo";

const formSchema = z.object({
  name: z.string().min(1, { message: "Tag name is required" }).max(40),
  color: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTagFormProps {
  workspaceslug: string;
  initialData?: {
    id: string;
    name: string;
    color: string | null;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CreateTagForm = ({
  workspaceslug,
  initialData,
  open: controlledOpen,
  onOpenChange,
}: CreateTagFormProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      color: initialData?.color ?? "#F87171",
    },
  });


  const {
    handleSubmit,
    control,
    formState: { isSubmitting, isValid },
    reset,
  } = form;

  // Reset form when initialData changes or dialog opens
  useEffect(() => {
    if (open && initialData) {
      reset({
        name: initialData.name,
        color: initialData.color ?? "#F87171",
      });
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (initialData) {
        // Edit mode
        const response = await axios.patch(
          `/api/workspace/${workspaceslug}/tags/${initialData.id}`,
          data,
        );
        if (response.status === 200) {
          toast.success("Tag updated successfully!");
          await mutate(`/api/workspace/${workspaceslug}/tags`);
          setOpen(false);
        }
      } else {
        // Create mode
        const response = await axios.post(
          `/api/workspace/${workspaceslug}/tags`,
          data,
        );
        if (response.status === 201) {
          toast.success("Tag created successfully!");
          // Revalidate tags data
          await mutate(`/api/workspace/${workspaceslug}/tags`);
          setOpen(false);
        }
      }
      reset();
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 400) {
          toast.error("Tag name already exists.");
        } else {
          toast.error(
            `Error ${initialData ? "updating" : "creating"} tag. Please try again.`,
          );
        }
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!initialData && (
        <DialogTrigger className="w-fit" onClick={() => setOpen(true)}>
          <Button className="flex items-center justify-center gap-x-2">
            <Plus size={17} />
            <span className="hidden sm:inline">Create Tag</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center justify-center">
          <DialogTitle className="flex flex-col items-center gap-y-3">
            <AppLogo />
            {initialData ? "Edit Tag" : "Create Tag"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Edit your tag details."
              : "Create a new tag to organize your links."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="tag-name">Tag Name</FormLabel>
                  <FormControl>
                    <Input
                      id="tag-name"
                      placeholder="e.g. Important"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="tag-color">Tag Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2 py-1">
                      {COLOR_OPTIONS.map((color) => (
                        <Badge
                          key={color.value}
                          onClick={() => field.onChange(color.value)}
                          className={`${color.bgColor} ${color.textColor} cursor-pointer rounded-full px-3 select-none hover:${color.bgColor} py-1 transition ${field.value === color.value ? `border ${color.borderColor}` : "border border-transparent"} shadow-none`}
                          style={{ fontWeight: 500 }}
                          aria-label={color.name}
                        >
                          {color.name}
                        </Badge>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? "Update Tag" : "Create Tag"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTagForm;
