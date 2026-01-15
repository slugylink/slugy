"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { Check } from "lucide-react";

const COLORS = ["#000000", "#0abf53", "#FF5F2D", "#FF0000", "#ecb731"] as const;

const QR_OPTIONS = {
  width: 200,
  height: 200,
  type: "svg" as const,
  margin: 1,
  qrOptions: {
    typeNumber: 0 as const,
    mode: "Byte" as const,
    errorCorrectionLevel: "H" as const,
  },
  dotsOptions: {
    type: "square" as const,
  },
  imageOptions: {
    hideBackgroundDots: true,
    crossOrigin: "anonymous",
  },
  backgroundOptions: {
    color: "#ffffff",
  },
};

interface QRCodeDesignerProps {
  code: string;
}

const QRCodePreview = ({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) => (
  <div className="bg-muted relative flex w-full items-center justify-center rounded-lg border py-3">
    <div
      ref={containerRef}
      className="flex aspect-square h-[130px] w-[130px] items-center justify-center bg-white p-0"
    />
  </div>
);

const ColorPicker = ({
  color,
  onChange,
}: {
  color: string;
  onChange: (val: string) => void;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <div
        style={{ borderColor: color }}
        className="flex items-center gap-0 overflow-hidden rounded-md border-2"
      >
        <div
          className="h-8 w-8 cursor-pointer"
          style={{ backgroundColor: color }}
        />
        <Input
          value={color}
          readOnly
          className="h-fit w-24 border-none focus:outline-none focus-visible:ring-0"
        />
      </div>
    </PopoverTrigger>
    <PopoverContent className="w-fit p-0">
      <HexColorPicker color={color} onChange={onChange} />
    </PopoverContent>
  </Popover>
);

const ColorButtons = ({
  colors,
  selectedColor,
  onClick,
}: {
  colors: readonly string[];
  selectedColor: string;
  onClick: (color: string) => void;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {colors.map((color) => (
      <button
        key={color}
        type="button"
        onClick={() => onClick(color)}
        className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
          selectedColor === color ? "border-primary" : "border-transparent"
        }`}
        style={{ backgroundColor: color }}
      >
        <Check
          size={16}
          strokeWidth={2.5}
          className={`h-4 w-4 ${
            selectedColor === color ? "text-white" : "text-transparent"
          }`}
        />
      </button>
    ))}
  </div>
);

const QRCodeDesigner = ({ code }: QRCodeDesignerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[1]); // default color

  const updateQRCode = useCallback(
    (color: string) => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";
      qrRef.current = new QRCodeStyling({
        ...QR_OPTIONS,
        data: `https://slugy.co/${code}`,
        dotsOptions: { ...QR_OPTIONS.dotsOptions, color },
      });
      qrRef.current.append(containerRef.current);
    },
    [code],
  );

  useEffect(() => {
    updateQRCode(selectedColor);
  }, [selectedColor, updateQRCode]);

  useEffect(
    () => () => {
      qrRef.current = null;
    },
    [],
  );

  return (
    <div className="space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <span className="py-2 font-medium">QR Code Design</span>
      </div>

      <QRCodePreview containerRef={containerRef} />

      <div className="space-y-2">
        <Label className="text-sm font-medium">Colors</Label>
        <div className="flex items-center gap-2">
          <ColorPicker color={selectedColor} onChange={setSelectedColor} />
          <ColorButtons
            colors={COLORS}
            selectedColor={selectedColor}
            onClick={setSelectedColor}
          />
        </div>
      </div>
    </div>
  );
};

export default QRCodeDesigner;
