export interface BioFeatureItem {
  title: string;
  image: string;
  href: string;
}

export type BioContactIcon = "phone" | "globe" | "mail";

export interface BioContactItem {
  label: string;
  value: string;
  href: string;
  icon: BioContactIcon;
}

interface BioData {
  feature: BioFeatureItem[];
  contact: BioContactItem[];
}

export const BIO_DATA: BioData = {
  feature: [
    {
      title: "How I Plan My Week in 15 Minutes",
      image:
        "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1159&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      href: "#",
    },
    {
      title: "3 Creator Mistakes to Avoid",
      image:
        "https://res.cloudinary.com/dcsouj6ix/image/upload/v1771069188/slugy_fu4ozk.avif",
      href: "#",
    },
  ],
  contact: [
    {
      label: "Phone",
      value: "+1 (555) 123-4567",
      href: "tel:+15551234567",
      icon: "phone",
    },
    {
      label: "Website",
      value: "slugy.app",
      href: "https://slugy.app",
      icon: "globe",
    },
    {
      label: "Email",
      value: "hello@slugy.app",
      href: "mailto:hello@slugy.app",
      icon: "mail",
    },
  ],
};
