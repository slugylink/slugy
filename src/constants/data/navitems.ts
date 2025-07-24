import {
  FolderIcon,
  HelpCircleIcon,
  LineChartIcon,
  Link2Icon,
  NewspaperIcon,
  // QrCodeIcon,
} from "lucide-react";

export const NAV_LINKS = [
  {
    title: "Features",
    href: "/features",
    menu: [
      {
        title: "Link Shortening",
        tagline: "Shorten links and track their performance.",
        href: "/",
        icon: Link2Icon,
      },

      {
        title: "Advanced Analytics",
        tagline: "Gain insights into who is clicking your links.",
        href: "/",
        icon: LineChartIcon,
      },
      {
        title: "Bio Links",
        tagline: "Your links in one place for easy sharing.",
        href: "/",
        icon: FolderIcon,
      },
    ],
  },
  // {
  //   title: "Pricing",
  //   href: "/pricing",
  // },
  {
    title: "Resources",
    href: "/",
    menu: [
      {
        title: "Blog",
        tagline: "Read articles on the latest trends in tech.",
        href: "/",
        icon: NewspaperIcon,
      },
      {
        title: "Help",
        tagline: "Get answers to your questions.",
        href: "/",
        icon: HelpCircleIcon,
      },
    ],
  },
  // {
  //   title: "Changelog",
  //   href: "/changelog",
  // },
];
