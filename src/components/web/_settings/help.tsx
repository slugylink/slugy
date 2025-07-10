"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BadgeHelp } from "lucide-react";

const HelpTooltip = () => {
  return (
    <TooltipProvider>
      <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-12 rounded-full p-2 shadow-lg transition-all duration-300 hover:shadow-xl sm:size-14 sm:p-3"
              aria-label="Get help"
            >
              <BadgeHelp className="size-6 sm:size-7" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center">
            <p>Need help? Click here!</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default HelpTooltip;
