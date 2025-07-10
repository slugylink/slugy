import React from "react";
import HelpTooltip from "@/components/web/_settings/help";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <HelpTooltip />
    </div>
  );
}
