"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function DateRangePicker({
  value,
  onChange,
  className,
}: {
  value?: DateRange | { from: Date | null; to: Date | null };
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
}) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 20),
  });
  const normalizedDate = value
    ? {
        from: value.from ?? undefined,
        to: value.to ?? undefined,
      }
    : internalDate;
  const handleSelect = onChange ?? setInternalDate;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !normalizedDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {normalizedDate?.from ? (
              normalizedDate.to ? (
                <>
                  {format(normalizedDate.from, "LLL dd, y")} -{" "}
                  {format(normalizedDate.to, "LLL dd, y")}
                </>
              ) : (
                format(normalizedDate.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={normalizedDate?.from}
            selected={normalizedDate}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
