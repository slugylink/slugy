"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
  type RefObject,
  useMemo,
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

// ============================================================================
// Types
// ============================================================================

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

interface QRCodeDesignerProps {
  linkId: string;
  domain: string;
  code: string;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Constants
// ============================================================================

const STATIC_LOGO = {
  src: "/logo.svg",
  size: 0.3,
  margin: 5,
} as const;

const QR_CONFIG = {
  DEFAULT_SIZE: 300,
  BACKGROUND_COLOR: "#ffffff",
  MIN_SIZE: 256,
  MAX_SIZE: 2048,
  LOGO_SIZE: 0.5,
  CANVAS_SCALE: 4,
  DEFAULT_MARGIN: 2,
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
  margin: QR_CONFIG.DEFAULT_MARGIN,
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

// ============================================================================
// Utilities
// ============================================================================

function createCanvasFromSVG(svg: SVGElement, scale: number = 1) {
  const canvas = document.createElement("canvas");
  const svgElement = svg as SVGElement & {
    width: { baseVal: { value: number } };
    height: { baseVal: { value: number } };
  };

  canvas.width = svgElement.width.baseVal.value * scale;
  canvas.height = svgElement.height.baseVal.value * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  return { canvas, ctx };
}

function svgToBlob(svg: SVGElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      resolve(svgBlob);
    } catch (error) {
      reject(error);
    }
  });
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

const QRCodePreview = memo(
  ({
    containerRef,
    isFetching,
  }: {
    containerRef: RefObject<HTMLDivElement | null>;
    isFetching: boolean;
  }) => (
    <div className="bg-muted relative flex aspect-[16/5] w-full items-center justify-center rounded-lg border py-3">
      {isFetching && (
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

// ============================================================================
// Main Component
// ============================================================================

export default function QRCodeDesigner({
  linkId,
  domain,
  code,
  onOpenChange,
}: QRCodeDesignerProps) {
  const url = `https://${domain}/${code}?via=qr`;

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [initialState, setInitialState] = useState<FormState>(() => ({
    url,
    fgColor: "#000000",
    size: QR_CONFIG.DEFAULT_SIZE,
    dotStyle: "square",
  }));
  const [formState, setFormState] = useState<FormState>(() => ({
    url,
    fgColor: "#000000",
    size: QR_CONFIG.DEFAULT_SIZE,
    dotStyle: "square",
  }));
  const [options, setOptions] = useState<Options>(() => ({
    ...DEFAULT_QR_OPTIONS,
    data: url,
    dotsOptions: {
      color: "#000000",
      type: "square",
    },
    image: STATIC_LOGO.src,
  }));

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  // Check if form has changes
  const isFormDirty = useMemo(() => {
    return (
      formState.fgColor !== initialState.fgColor ||
      formState.size !== initialState.size ||
      formState.dotStyle !== initialState.dotStyle ||
      formState.logo !== initialState.logo
    );
  }, [formState, initialState]);

  // ============================================================================
  // Handlers
  // ============================================================================

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

  const downloadHighQualityQR = useCallback(async () => {
    if (!qrCodeRef.current || !containerRef.current) return;

    try {
      const svg = containerRef.current.querySelector("svg");
      if (!svg) throw new Error("SVG element not found");

      const { canvas, ctx } = createCanvasFromSVG(svg, QR_CONFIG.CANVAS_SCALE);
      const svgBlob = await svgToBlob(svg);
      const img = await blobToImage(svgBlob);

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
  }, []);

  const handleCopyImage = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const svg = containerRef.current.querySelector("svg");
      if (!svg) throw new Error("SVG element not found");

      const svgBlob = await svgToBlob(svg);
      const img = await blobToImage(svgBlob);
      const { canvas, ctx } = createCanvasFromSVG(svg);

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toast.success("QR code copied to clipboard");
        } catch (err) {
          console.error("Failed to copy image: ", err);
          toast.error("Failed to copy QR code");
        }
      }, "image/png");
    } catch (error) {
      console.error("Error copying image:", error);
      toast.error("Failed to copy QR code");
    }
  }, []);

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

  // ============================================================================
  // Effects
  // ============================================================================

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

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-medium">Preview</span>
        <div className="flex gap-2">
          <Button
            onClick={downloadHighQualityQR}
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

      {/* Preview */}
      <QRCodePreview containerRef={containerRef} isFetching={isFetching} />

      {/* Color Picker */}
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

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button disabled={isSaving || !isFormDirty} onClick={handleSave}>
          {isSaving && <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
