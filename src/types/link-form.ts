import { z } from "zod";

const urlPattern = /^https?:\/\//;

export const linkFormSchema = z.object({
  url: z
    .string()
    .url("Please enter a valid URL")
    .min(1, "Destination URL is required")
    .refine(
      (url) => {
        try {
          new URL(url);
          return urlPattern.test(url);
        } catch {
          return false;
        }
      },
      {
        message: "Please enter a valid URL (e.g., https://example.com)",
      },
    ),
  domain: z.string().min(1, "Domain is required"),
  slug: z
    .string()
    .max(50, "Max 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]*$/,
      "Slug can only contain letters, numbers, dashes (-), and underscores (_)",
    )
    .optional()
    .refine(
      (val) => !val || val.length === 0 || val.length >= 3,
      { message: "Slug must be at least 3 characters if provided" }
    ),
  description: z.string().optional(),
  password: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  tags: z.string().array().optional(),
});

export type LinkFormValues = z.infer<typeof linkFormSchema>;

export interface LinkData extends LinkFormValues {
  id?: string;
  clicks?: number;
  creatorId?: string;
  expirationUrl?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  image?: string | null;
  qrCode: {
    id: string;
    customization?: string;
  };
}
