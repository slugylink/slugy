import {
  FolderIcon,
  HandHeart,
  HelpCircleIcon,
  LineChartIcon,
  Link2Icon,
  NewspaperIcon,
  QrCodeIcon,
  TablePropertiesIcon,
  WrenchIcon,
} from "lucide-react";

export const NAV_LINKS = [
  {
    title: "Features",
    href: "/#features",
    menu: [
      {
        title: "Link Shortening",
        tagline: "Shorten links and track their performance.",
        href: "/#features",
        icon: Link2Icon,
      },

      {
        title: "Advanced Analytics",
        tagline: "Gain insights into who is clicking your links.",
        href: "/#features",
        icon: LineChartIcon,
      },
      {
        title: "Bio Links",
        tagline: "Your links in one place for easy sharing.",
        href: "/#features",
        icon: FolderIcon,
      },
    ],
  },
  {
    title: "Free Tools",
    href: "/tools",
    menu: [
      {
        title: "QR Code Generator",
        tagline: "Free custom QR codes — PNG & SVG, no login.",
        href: "/tools/qr-code-generator",
        icon: QrCodeIcon,
      },
      {
        title: "UTM Builder",
        tagline: "Campaign URLs validated for GA4.",
        href: "/tools/utm-builder",
        icon: TablePropertiesIcon,
      },
    ],
  },
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "Resources",
    href: "/blogs",
    menu: [
      {
        title: "Blog",
        tagline: "Guides on analytics, leads, and short links.",
        href: "/blogs",
        icon: NewspaperIcon,
      },
      {
        title: "Help",
        tagline: "Get answers to your questions.",
        href: "https://github.com/slugylink/slugy/discussions/categories/feedback",
        icon: HelpCircleIcon,
      },
      {
        title: "Sponsors",
        tagline: "Meet the companies backing Slugy.",
        href: "/sponsors",
        icon: HandHeart,
      },
    ],
  },
  // {
  //   title: "Changelog",
  //   href: "/changelog",
  // },
];
