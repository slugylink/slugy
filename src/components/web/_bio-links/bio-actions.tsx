"use client";
import { useState } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { EllipsisVertical, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  RiSnapchatFill,
  RiFacebookFill,
  RiInstagramLine,
  RiLinkedinFill,
  RiTwitterXFill,
  RiWhatsappFill,
} from "react-icons/ri";

const ShareActions = ({ color }: { color: string }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    const currentUrl = window.location.href;
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = (platform: string) => {
    const currentUrl = encodeURIComponent(window.location.href);
    const title = encodeURIComponent("Check out this link");

    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${currentUrl}&text=${title}`;
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${title}%20${currentUrl}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`;
        break;
      case "messenger":
        shareUrl = `https://www.facebook.com/dialog/send?link=${currentUrl}&app_id=291494419107518&redirect_uri=${currentUrl}`;
        break;
      case "snapchat":
        shareUrl = `https://snapchat.com/scan?attachmentUrl=${currentUrl}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, "_blank");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full bg-white/20 hover:bg-white/40"
        onClick={() => setOpen(true)}
      >
        <EllipsisVertical className={`h-4 w-4 ${color}`} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Share Link</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-4 py-4">
            <ShareButton
              icon={
                copied ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Copy className="h-5 w-5" />
                )
              }
              label="Copy Link"
              onClick={copyToClipboard}
            />
            <ShareButton
              icon={<RiTwitterXFill className="h-5 w-5 text-black" />}
              label="X"
              onClick={() => shareUrl("twitter")}
            />
            <ShareButton
              icon={<RiFacebookFill className="h-5 w-5 text-blue-600" />}
              label="Facebook"
              onClick={() => shareUrl("facebook")}
            />
            <ShareButton
              icon={<RiWhatsappFill className="h-5 w-5 text-green-500" />}
              label="WhatsApp"
              onClick={() => shareUrl("whatsapp")}
            />
            <ShareButton
              icon={<RiLinkedinFill className="h-5 w-5 text-blue-700" />}
              label="LinkedIn"
              onClick={() => shareUrl("linkedin")}
            />
            <ShareButton
              icon={<RiInstagramLine className="h-5 w-5 text-pink-500" />}
              label="Instagram"
              onClick={() =>
                toast.info("Instagram sharing is not supported directly.")
              }
            />
            <ShareButton
              icon={<RiSnapchatFill className="h-5 w-5 text-yellow-400" />}
              label="Snapchat"
              onClick={() => shareUrl("snapchat")}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ShareButton = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 rounded-full"
        onClick={onClick}
      >
        {icon}
      </Button>
      <span className="text-xs">{label}</span>
    </div>
  );
};

export default ShareActions;
