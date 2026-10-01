"use client";

import { Button } from "@/components/ui/button";

export default function HeroDemoButton() {
  const handleViewDemo = () => {
    const demoSection = document.getElementById("features");
    if (!demoSection) return;
    demoSection.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleViewDemo}
      className="border-zinc-300 bg-white/70 text-zinc-800 transition-transform duration-200 hover:scale-[1.02] hover:bg-zinc-50 active:scale-[0.98]"
    >
      View a Demo
    </Button>
  );
}
