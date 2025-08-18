"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  memo,
  type RefObject,
} from "react";
import QRCodeStyling, { type Options } from "qr-code-styling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { Download, Copy, Check } from "lucide-react";
import { getQrCode, saveQrCode } from "@/server/actions/save-qrcode";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";

type DotType =
  | "square"
  | "dots"
  | "rounded"
  | "classy"
  | "classy-rounded"
  | "extra-rounded";

interface FormState {
  url: string;
  fgColor: string;
  size: number;
  dotStyle: DotType;
  logo?: string;
}

const STATIC_LOGO = {
  src: "/logo.svg", // Path to your brand logo
  size: 0.3, // Size relative to QR code (30%)
  margin: 5, // Margin around logo
};

const QR_CONFIG = {
  DEFAULT_SIZE: 300,
  BACKGROUND_COLOR: "#ffffff",
  MIN_SIZE: 256,
  MAX_SIZE: 2048,
  LOGO_SIZE: 0.5,
} as const;

const COLORS = [
  "#000000", // Black
  "#FF5F2D", // Orange
  "#FF0000", // Red
  "#ecb731", // Gold
  "#0abf53", // Green
  "#1DA1F2", // Blue
  "#833AB4", // Purple
] as const;

const DEFAULT_QR_OPTIONS: Options = {
  width: QR_CONFIG.DEFAULT_SIZE * 1.3,
  height: QR_CONFIG.DEFAULT_SIZE * 1.3,
  type: "svg",
  margin: 2,
  qrOptions: {
    typeNumber: 0,
    mode: "Byte",
    errorCorrectionLevel: "H",
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: STATIC_LOGO.size,
    margin: STATIC_LOGO.margin,
    crossOrigin: "anonymous",
  },
  backgroundOptions: {
    color: QR_CONFIG.BACKGROUND_COLOR,
  },
} as const;

interface QRCodeDesignerProps {
  linkId: string;
  code: string;
  onOpenChange: (open: boolean) => void;
}

const QRCodePreview = memo(
  ({
    containerRef,
    isLoading,
    isFetching,
  }: {
    containerRef: RefObject<HTMLDivElement | null>;
    isLoading: boolean;
    isFetching: boolean;
  }) => (
    <div className="bg-muted relative flex aspect-[16/5] w-full items-center justify-center rounded-lg border py-3">
      {(isLoading || isFetching) && (
        <div className="bg-background/80 absolute top-0 left-0 flex aspect-video h-full w-full items-center justify-center backdrop-blur-sm">
          <LoaderCircle className="h-5 w-5 animate-spin" />
        </div>
      )}
      <div
        ref={containerRef}
        className="flex aspect-square h-[150px] w-[150px] items-center justify-center bg-white p-1.5"
      />
    </div>
  ),
);
QRCodePreview.displayName = "QRCodePreview";

const ColorPicker = memo(
  ({
    color,
    onChange,
  }: {
    color: string;
    onChange: (color: string) => void;
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
            onChange={(e) => onChange(e.target.value)}
            className="h-fit w-24 border-none focus:outline-none focus-visible:ring-0"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0">
        <HexColorPicker color={color} onChange={onChange} />
      </PopoverContent>
    </Popover>
  ),
);
ColorPicker.displayName = "ColorPicker";

const ColorButtons = memo(
  ({
    colors,
    selectedColor,
    onColorSelect,
  }: {
    colors: readonly string[];
    selectedColor: string;
    onColorSelect: (color: string) => void;
  }) => (
    <div className="relative z-[2] flex flex-wrap gap-1.5">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Select color ${color}`}
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
            selectedColor === color ? "border-primary" : "border-transparent"
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onColorSelect(color)}
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
  ),
);
ColorButtons.displayName = "ColorButtons";

export default function QRCodeDesigner({
  linkId,
  code,
  onOpenChange,
}: QRCodeDesignerProps) {
  const url = useMemo(() => `https://slugy.co/${code}`, [code]);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  const [initialState, setInitialState] = useState<FormState>({
    url,
    fgColor: "#000000",
    size: QR_CONFIG.DEFAULT_SIZE,
    dotStyle: "square",
  });

  const [formState, setFormState] = useState<FormState>({
    url,
    fgColor: "#000000",
    size: QR_CONFIG.DEFAULT_SIZE,
    dotStyle: "square",
  });

  const isFormDirty = useMemo(() => {
    return (
      formState.fgColor !== initialState.fgColor ||
      formState.size !== initialState.size ||
      formState.dotStyle !== initialState.dotStyle ||
      formState.logo !== initialState.logo
    );
  }, [formState, initialState]);

  const [options, setOptions] = useState<Options>(() => ({
    ...DEFAULT_QR_OPTIONS,
    data: url,
    dotsOptions: {
      color: formState.fgColor,
      type: formState.dotStyle,
    },
    image: STATIC_LOGO.src, // Always show the static logo
  }));

  const downloadHighQualityQR = useCallback(
    async (
      qrCode: QRCodeStyling | undefined,
      containerRef: RefObject<HTMLDivElement | null>,
    ) => {
      if (!qrCode || !containerRef.current) return;

      try {
        const svg = containerRef.current.querySelector("svg");
        if (!svg) throw new Error("SVG element not found");

        const canvas = document.createElement("canvas");
        const scale = 4;
        canvas.width = svg.width.baseVal.value * scale;
        canvas.height = svg.height.baseVal.value * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], {
          type: "image/svg+xml;charset=utf-8",
        });
        const img = new Image();
        img.src = URL.createObjectURL(svgBlob);

        await new Promise((resolve) => {
          img.onload = resolve;
        });

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "qr-code.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          },
          "image/png",
          1.0,
        );
      } catch (error) {
        console.error("Error downloading QR code:", error);
        toast.error("Failed to download QR code");
      }
    },
    [],
  );

  const updateQRCode = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options);
      qrCodeRef.current.append(containerRef.current);
    } else {
      qrCodeRef.current.update(options);
    }
  }, [options]);

  const fetchQrCode = useCallback(async () => {
    if (!linkId) return;
    try {
      setIsFetching(true);
      const qrCodeData = await getQrCode(linkId);
      if (!qrCodeData) return;

      const updatedFormState = {
        url,
        fgColor: qrCodeData.fgColor as string,
        size: qrCodeData.size as number,
        dotStyle: qrCodeData.dotStyle as DotType,
        logo: qrCodeData.logo as string | undefined,
      };

      setInitialState(updatedFormState);
      setFormState(updatedFormState);

      setOptions((prev) => ({
        ...prev,
        width: qrCodeData.size as number,
        height: qrCodeData.size as number,
        dotsOptions: {
          ...prev.dotsOptions,
          color: qrCodeData.fgColor as string,
          type: qrCodeData.dotStyle as DotType,
        },
        image: STATIC_LOGO.src,
      }));
    } catch (error) {
      console.error("Failed to fetch QR code:", error);
      toast.error("Failed to load QR code settings");
    } finally {
      setIsFetching(false);
    }
  }, [linkId, url]);

  const handleFormChange = useCallback(
    (field: keyof FormState, value: string | number) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      setOptions((prev) => {
        const newOptions = { ...prev };
        if (field === "size") {
          newOptions.width = Number(value);
          newOptions.height = Number(value);
        } else if (field === "fgColor" || field === "dotStyle") {
          newOptions.dotsOptions = {
            ...prev.dotsOptions,
            ...(field === "fgColor" && { color: value.toString() }),
            ...(field === "dotStyle" && { type: value as DotType }),
          };
        }
        return newOptions;
      });
    },
    [],
  );

  const copyToClipboard = useCallback(async (blob: Blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("QR code copied to clipboard");
    } catch (err) {
      console.error("Failed to copy image: ", err);
      toast.error("Failed to copy QR code");
    }
  }, []);

  const handleCopyImage = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const svg = containerRef.current.querySelector("svg");
      if (!svg) throw new Error("SVG element not found");

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const img = new Image();
      img.src = URL.createObjectURL(svgBlob);

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement("canvas");
      canvas.width = svg.width.baseVal.value;
      canvas.height = svg.height.baseVal.value;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => blob && void copyToClipboard(blob), "image/png");
    } catch (error) {
      console.error("Error copying image:", error);
      toast.error("Failed to copy QR code");
    }
  }, [copyToClipboard]);

  const handleSave = useCallback(async () => {
    if (!qrCodeRef.current || !containerRef.current) return;
    try {
      setIsSaving(true);
      const svg = containerRef.current.querySelector("svg");
      if (!svg) throw new Error("SVG element not found");
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const imageUrl = URL.createObjectURL(blob);
      const result = await saveQrCode({
        linkId,
        imageUrl,
        customization: {
          fgColor: formState.fgColor,
          size: formState.size,
          dotStyle: formState.dotStyle,
          logo: formState.logo,
        },
      });
      if (result.success) {
        toast.success("QR code saved successfully");
        onOpenChange(false);
      } else {
        throw new Error(result.error ?? "Failed to save QR code");
      }
    } catch (error) {
      console.error("Failed to save QR code:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save QR code",
      );
    } finally {
      setIsSaving(false);
    }
  }, [linkId, formState, onOpenChange]);

  useEffect(() => {
    if (code) {
      void fetchQrCode();
    }
  }, [code, fetchQrCode]);

  useEffect(() => {
    updateQRCode();
  }, [updateQRCode]);

  useEffect(() => {
    return () => {
      if (qrCodeRef.current) {
        qrCodeRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">Preview</span>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              downloadHighQualityQR(
                qrCodeRef.current || undefined,
                containerRef,
              )
            }
            variant="ghost"
            size="icon"
            title="Download High Quality QR Code"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleCopyImage}
            variant="ghost"
            size="icon"
            title="Copy QR Code"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <QRCodePreview
        containerRef={containerRef}
        isLoading={false}
        isFetching={isFetching}
      />

      <div className="space-y-2">
        <Label className="text-sm font-medium">QR Code Color</Label>
        <div className="flex items-center gap-2">
          <ColorPicker
            color={formState.fgColor}
            onChange={(color) => handleFormChange("fgColor", color)}
          />
          <ColorButtons
            colors={COLORS}
            selectedColor={formState.fgColor}
            onColorSelect={(color) => handleFormChange("fgColor", color)}
          />
        </div>
      </div>

      {/*
        Uncomment and enable dot style selection if needed:
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label className="text-sm font-medium" htmlFor="dotStyle">
            Dot Style
          </Label>
          <Select
            value={formState.dotStyle}
            onValueChange={(value) =>
              handleFormChange("dotStyle", value as DotType)
            }
          >
            {DOT_STYLES.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>
      */}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button disabled={isSaving || !isFormDirty} onClick={handleSave}>
          {isSaving && <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />}{" "}
          Save
        </Button>
      </div>
    </div>
  );
}
