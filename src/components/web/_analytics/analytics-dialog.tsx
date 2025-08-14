"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scan } from "lucide-react";
import TableCard from "./table-card";

interface AnalyticsDialogProps<T> {
  data: T[];
  loading: boolean;
  error?: Error;
  keyPrefix: string;
  getClicks: (item: T) => number;
  getKey: (item: T, index: number) => string;
  progressColor?: string;
  renderName: (item: T) => React.ReactNode;
  title: string;
  headerLabel: string;
  showButton: boolean;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
}

export default function AnalyticsDialog<T>({
  data,
  loading,
  error,
  keyPrefix,
  getClicks,
  getKey,
  progressColor = "bg-muted",
  renderName,
  title,
  headerLabel,
  showButton,
  dialogOpen,
  onDialogOpenChange,
}: AnalyticsDialogProps<T>) {
  if (!showButton) return null;

  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogTrigger asChild>
          <Button size="xs" variant="secondary">
            <Scan className="mr-1 h-3 w-3" /> View All
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] max-w-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="mb-2 flex items-center border-b pb-2">
              <div className="flex-1 text-sm">{headerLabel}</div>
              <div className="min-w-[80px] text-right text-sm">Clicks</div>
            </div>
            <ScrollArea className="h-[60vh] w-full">
              <TableCard
                data={data}
                loading={loading}
                error={error}
                keyPrefix={`${keyPrefix}-dialog`}
                getClicks={getClicks}
                getKey={getKey}
                progressColor={progressColor}
                renderName={renderName}
              />
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
