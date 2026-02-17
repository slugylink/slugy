import { Globe, Mail, Phone, type LucideIcon } from "lucide-react";
import { BIO_DATA } from "@/constants/bio-data";
import Link from "next/link";

type ContactIcon = (typeof BIO_DATA.contact)[number]["icon"];

const CONTACT_ICON_MAP: Record<ContactIcon, LucideIcon> = {
  phone: Phone,
  globe: Globe,
  mail: Mail,
};

export default function Contact() {
  return (
    <section className="">
      <div className="rounded-xl bg-zinc-900">
        <div>
          {BIO_DATA.contact.map(({ label, value, href, icon }) => {
            const Icon = CONTACT_ICON_MAP[icon];

            return (
              <Link
                key={label}
                href={href}
                target={label === "Website" ? "_blank" : undefined}
                rel={label === "Website" ? "noreferrer" : undefined}
                className="group flex items-center gap-1 rounded-xl px-1 py-0.5 transition"
                aria-label={label}
              >
                <span className="flex size-8 shrink-0 items-center justify-center text-zinc-300 transition group-hover:text-white">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 truncate text-sm font-medium tracking-tight text-zinc-100">
                  {value}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
