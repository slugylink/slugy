import React from "react";
import { themes } from "@/constants/theme";
import { Button } from "./button";

interface ThemeConfirmToastProps {
  themeId: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ThemeConfirmToast: React.FC<ThemeConfirmToastProps> = ({
  themeId,
  onCancel,
  onConfirm,
}) => {
  const theme = themes.find((t) => t.id === themeId);
  const themeName = theme?.name || themeId;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-white p-3 shadow-md">
      <span className="text-sm">Theme changed to {themeName}</span>
      <div className="flex gap-1">
        <Button
        size={"sm"}
          onClick={onCancel}
          variant={"outline"}
        >
          Cancel
        </Button>
        <Button
        size={"sm"}
          onClick={onConfirm}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};
