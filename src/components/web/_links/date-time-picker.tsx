"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value: string | null;
  onChange: (val: string | null) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse value into date and time
  let date: Date | undefined = undefined;
  let time = "";
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      date = d;
      time = d.toISOString().substring(11, 19); // HH:MM:SS
    }
  }

  const handleDateChange = (selected: Date | undefined) => {
    if (!selected) {
      onChange(null);
      return;
    }
    // Keep the time part if available
    const newDate = new Date(selected);
    if (time) {
      const [h, m, s] = time.split(":");
      newDate.setHours(Number(h), Number(m), Number(s));
    }
    onChange(newDate.toISOString());
    setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    if (!date) return;
    const [h, m, s] = t.split(":");
    const newDate = new Date(date);
    newDate.setHours(Number(h), Number(m), Number(s || 0));
    onChange(newDate.toISOString());
  };

  return (
    <div className="flex gap-4 w-full">
      <div className="flex flex-col gap-3">
        <Label htmlFor="date-picker" className="px-1">
          Date
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className=" justify-between font-normal"
            >
              {date ? date.toLocaleDateString() : "Select date"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={handleDateChange}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="time-picker" className="px-1">
          Time
        </Label>
        <Input
          type="time"
          id="time-picker"
          step="1"
          value={time}
          onChange={handleTimeChange}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  );
}
