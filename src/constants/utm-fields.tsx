import {
  Globe,
  MousePointerClick,
  Flag,
  MessagesSquare,
  FileText,
  Gift,
  type LucideIcon,
} from "lucide-react";

export type UtmParamKey =
  | "source"
  | "medium"
  | "campaign"
  | "term"
  | "content"
  | "referral";

export interface UtmField {
  key: UtmParamKey;
  label: string;
  placeholder: string;
  icon: LucideIcon;
}

export const UTM_FIELDS: readonly UtmField[] = [
  { key: "source", label: "Source", placeholder: "google", icon: Globe },
  {
    key: "medium",
    label: "Medium",
    placeholder: "cpc",
    icon: MousePointerClick,
  },
  {
    key: "campaign",
    label: "Campaign",
    placeholder: "summer sale",
    icon: Flag,
  },
  {
    key: "term",
    label: "Term",
    placeholder: "running shoes",
    icon: MessagesSquare,
  },
  {
    key: "content",
    label: "Content",
    placeholder: "logo link",
    icon: FileText,
  },
  {
    key: "referral",
    label: "Referral",
    placeholder: "yoursite.com",
    icon: Gift,
  },
] as const;

export const UTM_TEMPLATE_FIELD_MAP = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  term: "utm_term",
  content: "utm_content",
  referral: "referral",
} as const satisfies Record<UtmParamKey, string>;

export interface UtmTemplate {
  id: string;
  name: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referral: string | null;
  isDefault: boolean;
  createdAt: string;
}

export function toUtmParams(template: UtmTemplate) {
  return {
    source: template.utm_source ?? "",
    medium: template.utm_medium ?? "",
    campaign: template.utm_campaign ?? "",
    term: template.utm_term ?? "",
    content: template.utm_content ?? "",
    referral: template.referral ?? "",
  };
}
