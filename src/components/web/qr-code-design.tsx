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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { Download, Check, Pipette } from "lucide-react";
import { getQrCode, saveQrCode } from "@/server/actions/save-qrcode";
import { getWorkspaceLogo } from "@/server/actions/workspace/workspace";
import { useWorkspaceStore } from "@/store/workspace";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { cn } from "@/lib/utils";

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
  showLogo: boolean;
}

interface QRCodeDesignerProps {
  linkId: string;
  domain: string;
  code: string;
  /** Pre-resolved workspace logo URL. When omitted, resolved via workspaceslug. */
  workspaceLogo?: string | null;
  /** Workspace slug used to resolve the logo. Falls back to the workspace store. */
  workspaceslug?: string | null;
  onOpenChange: (open: boolean) => void;
  onCustomizationSaved?: (customization: {
    fgColor: string;
    size: number;
    dotStyle: DotType;
    showLogo: boolean;
  }) => void;
  hideActions?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const QR_CONFIG = {
  DEFAULT_SIZE: 512,
  BACKGROUND_COLOR: "#ffffff",
  MIN_SIZE: 256,
  MAX_SIZE: 2048,
  CANVAS_SCALE: 4,
  DOWNLOAD_PADDING: 24,
  DEFAULT_MARGIN: 1.5,
} as const;

const COLORS = [
  "#000000",
  "#1d4ed8",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
] as const;

const SIZES = [256, 512, 1024, 2048] as const;

const DOT_STYLE_OPTIONS: ReadonlyArray<{
  value: DotType;
  label: string;
  preview: string;
}> = [
  { value: "square", label: "Square", preview: "rounded-[2px]" },
  { value: "dots", label: "Dots", preview: "rounded-full" },
  { value: "rounded", label: "Rounded", preview: "rounded-[5px]" },
  { value: "classy", label: "Classy", preview: "rounded-[2px_6px_2px_6px]" },
  { value: "extra-rounded", label: "Soft", preview: "rounded-[7px]" },
] as const;

const DEFAULT_QR_OPTIONS: Options = {
  width: QR_CONFIG.DEFAULT_SIZE,
  height: QR_CONFIG.DEFAULT_SIZE,
  type: "svg",
  margin: QR_CONFIG.DEFAULT_MARGIN,
  qrOptions: {
    typeNumber: 0,
    mode: "Byte",
    errorCorrectionLevel: "H",
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
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    img.src = objectUrl;
  });
}

/**
 * Fetch a remote logo and inline it as a data URL so the rendered QR SVG
 * stays self-contained (sharp PNG export, no canvas tainting).
 */
function fetchImageAsDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return Promise.resolve(src);
  return fetch(src, { mode: "cors" }).then(async (res) => {
    if (!res.ok) throw new Error("Logo fetch failed");
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Logo read failed"));
      reader.readAsDataURL(blob);
    });
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
      {children}
    </p>
  );
}

const QRCodePreview = memo(
  ({
    containerRef,
    isFetching,
  }: {
    containerRef: RefObject<HTMLDivElement | null>;
    isFetching: boolean;
  }) => (
    <div className="bg-muted/60 relative flex w-full items-center justify-center rounded-xl border p-4">
      {isFetching && (
        <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded-xl backdrop-blur-sm">
          <LoaderCircle className="h-5 w-5 animate-spin" />
        </div>
      )}
      <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-zinc-200">
        <div
          ref={containerRef}
          className="flex aspect-square h-[168px] w-[168px] items-center justify-center overflow-hidden [&>svg]:h-full [&>svg]:w-full"
        />
      </div>
    </div>
  ),
);
QRCodePreview.displayName = "QRCodePreview";

const ColorSwatches = memo(
  ({
    colors,
    selectedColor,
    onColorSelect,
  }: {
    colors: readonly string[];
    selectedColor: string;
    onColorSelect: (color: string) => void;
  }) => (
    <div className="ml-2 flex flex-wrap items-center gap-1.5">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Select color ${color}`}
          onClick={() => onColorSelect(color)}
          style={{ backgroundColor: color }}
          className={cn(
            "flex size-7 cursor-pointer items-center justify-center rounded-full transition-all",
            selectedColor.toLowerCase() === color.toLowerCase()
              ? "ring-foreground ring-offset-background ring-2 ring-offset-2"
              : "ring-1 ring-black/10 hover:scale-105 dark:ring-white/20",
          )}
        >
          {selectedColor.toLowerCase() === color.toLowerCase() && (
            <Check className="h-3.5 w-3.5 text-white mix-blend-difference" />
          )}
        </button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Pick a custom color"
            style={{ backgroundColor: selectedColor }}
            className={cn(
              "flex size-7 cursor-pointer items-center justify-center rounded-full transition-all",
              !colors.some(
                (c) => c.toLowerCase() === selectedColor.toLowerCase(),
              )
                ? "ring-foreground ring-offset-background ring-2 ring-offset-2"
                : "ring-1 ring-black/10 hover:scale-105 dark:ring-white/20",
            )}
          >
            <Pipette className="h-3.5 w-3.5 text-white mix-blend-difference" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-fit p-3" align="start">
          <HexColorPicker color={selectedColor} onChange={onColorSelect} />
          <Input
            value={selectedColor}
            onChange={(e) => onColorSelect(e.target.value)}
            className="mt-2 h-8 font-mono text-xs uppercase"
            maxLength={7}
            aria-label="Custom color hex"
          />
        </PopoverContent>
      </Popover>
    </div>
  ),
);
ColorSwatches.displayName = "ColorSwatches";

// ============================================================================
// Main Component
// ============================================================================

export default function QRCodeDesigner({
  linkId,
  domain,
  code,
  workspaceLogo,
  workspaceslug: workspaceslugProp,
  onOpenChange,
  onCustomizationSaved,
  hideActions = false,
}: QRCodeDesignerProps) {
  const url = `https://${domain}/${code}?ref=qr`;
  const storeSlug = useWorkspaceStore((s) => s.workspaceslug);
  const slugForLogo = workspaceslugProp ?? storeSlug ?? null;

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [initialState, setInitialState] = useState<FormState>(() => ({
    url,
    fgColor: "#000000",
    size: QR_CONFIG.DEFAULT_SIZE,
    dotStyle: "extra-rounded",
    showLogo: false,
  }));
  const [formState, setFormState] = useState<FormState>(() => ({
    url,
    fgColor: "#000000",
    size: QR_CONFIG.DEFAULT_SIZE,
    dotStyle: "extra-rounded",
    showLogo: false,
  }));
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState<string | null>(
    workspaceLogo ?? null,
  );
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoIsRemote, setLogoIsRemote] = useState(false);
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  // Check if form has changes
  const isFormDirty = useMemo(() => {
    return (
      formState.fgColor !== initialState.fgColor ||
      formState.size !== initialState.size ||
      formState.dotStyle !== initialState.dotStyle ||
      formState.showLogo !== initialState.showLogo
    );
  }, [formState, initialState]);

  // Single source of truth for the QR render options — derived from form
  // state instead of patched by separate writers (no ordering races).
  // `imageOptions` is always a full object: qr-code-styling v1 reads
  // `imageOptions.hideBackgroundDots` unguarded inside `update()`.
  const options: Options = useMemo(() => {
    const exportSize = Math.max(
      QR_CONFIG.MIN_SIZE,
      Math.min(
        QR_CONFIG.MAX_SIZE,
        Number(formState.size) || QR_CONFIG.DEFAULT_SIZE,
      ),
    );
    const image = formState.showLogo && logoDataUrl ? logoDataUrl : undefined;
    return {
      ...DEFAULT_QR_OPTIONS,
      data: url,
      width: exportSize,
      height: exportSize,
      dotsOptions: {
        color: formState.fgColor,
        type: formState.dotStyle,
      },
      image,
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 8,
        // Intentionally no `crossOrigin` and `saveAsBlob: false`: the
        // library has no image `onerror` handler, so a CORS-blocked logo
        // would hang `append()` forever and leave a blank preview.
        saveAsBlob: false,
      },
    };
  }, [url, formState, logoDataUrl]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const updateQRCode = useCallback(() => {
    if (!containerRef.current) return;

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options);
    } else {
      qrCodeRef.current.update(options);
    }

    containerRef.current.replaceChildren();
    qrCodeRef.current.append(containerRef.current);
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
        showLogo: (qrCodeData.showLogo as boolean) ?? false,
      };

      setInitialState(updatedFormState);
      setFormState(updatedFormState);
    } catch (error) {
      console.error("Failed to fetch QR code:", error);
      toast.error("Failed to load QR code settings");
    } finally {
      setIsFetching(false);
    }
  }, [linkId, url]);

  const handleFormChange = useCallback(
    (field: keyof FormState, value: string | number | boolean) => {
      // Render options derive from formState via useMemo — nothing else to sync.
      setFormState((prev) => ({ ...prev, [field]: value }));
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
      const padding = QR_CONFIG.DOWNLOAD_PADDING * QR_CONFIG.CANVAS_SCALE;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = canvas.width + padding * 2;
      exportCanvas.height = canvas.height + padding * 2;

      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) throw new Error("Could not get export canvas context");

      exportCtx.fillStyle = QR_CONFIG.BACKGROUND_COLOR;
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      exportCtx.drawImage(canvas, padding, padding);

      exportCanvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error(
              logoIsRemote
                ? "Export blocked: logo host must allow CORS. Preview is unaffected."
                : "Failed to render QR code image",
            );
            return;
          }
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
  }, [logoIsRemote]);

  const handleSave = useCallback(async () => {
    if (!qrCodeRef.current || !containerRef.current) return;

    try {
      setIsSaving(true);
      const svg = containerRef.current.querySelector("svg");
      if (!svg) throw new Error("SVG element not found");

      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const imageUrl = URL.createObjectURL(blob);

      const result = await (async () => {
        try {
          return await saveQrCode({
            linkId,
            imageUrl,
            customization: {
              fgColor: formState.fgColor,
              size: formState.size,
              dotStyle: formState.dotStyle,
              showLogo: formState.showLogo,
            },
          });
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      })();

      if (result.success) {
        onCustomizationSaved?.({
          fgColor: formState.fgColor,
          size: formState.size,
          dotStyle: formState.dotStyle,
          showLogo: formState.showLogo,
        });
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
  }, [linkId, formState, onCustomizationSaved, onOpenChange]);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (code) {
      void fetchQrCode();
    }
  }, [code, fetchQrCode]);

  // Resolve the workspace logo: explicit prop wins, otherwise fetch by slug.
  useEffect(() => {
    if (workspaceLogo !== undefined) {
      setWorkspaceLogoUrl(workspaceLogo);
      return;
    }
    if (!slugForLogo) {
      setWorkspaceLogoUrl(null);
      return;
    }
    let cancelled = false;
    void getWorkspaceLogo(slugForLogo).then((res) => {
      if (!cancelled) setWorkspaceLogoUrl(res.success ? res.logo : null);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceLogo, slugForLogo]);

  // Inline the logo as a data URL so the SVG stays self-contained.
  // Falls back to the remote URL (preview still renders; export needs CORS).
  useEffect(() => {
    if (!workspaceLogoUrl) {
      setLogoDataUrl(null);
      setLogoIsRemote(false);
      return;
    }
    let cancelled = false;
    void fetchImageAsDataUrl(workspaceLogoUrl)
      .then((dataUrl) => {
        if (cancelled) return;
        setLogoDataUrl(dataUrl);
        setLogoIsRemote(!dataUrl.startsWith("data:"));
      })
      .catch(() => {
        if (cancelled) return;
        setLogoDataUrl(workspaceLogoUrl);
        setLogoIsRemote(true);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceLogoUrl]);

  // (Logo application lives in the derived `options` above — web quirk
  // notes: `update()` reads `imageOptions.hideBackgroundDots` unguarded,
  // and `loadImage()` has no `onerror`, so `crossOrigin` stays unset and
  // `saveAsBlob` stays false to avoid hanging `append()` on CORS hosts.)

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
    <div className="flex flex-col gap-5 overflow-x-hidden">
      {/* Preview */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <SectionLabel>Preview</SectionLabel>
          <Button
            onClick={downloadHighQualityQR}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Download high quality PNG"
            aria-label="Download high quality PNG"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
        <QRCodePreview containerRef={containerRef} isFetching={isFetching} />
      </div>

      {/* Color */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-[13px] font-medium">Color</Label>
          <code className="text-muted-foreground font-mono text-xs uppercase">
            {formState.fgColor}
          </code>
        </div>
        <ColorSwatches
          colors={COLORS}
          selectedColor={formState.fgColor}
          onColorSelect={(color) => handleFormChange("fgColor", color)}
        />
      </div>

      {/* Pattern */}
      <div className="space-y-2.5">
        <Label className="text-[13px] font-medium">Pattern</Label>
        <Select
          value={formState.dotStyle}
          onValueChange={(value) =>
            handleFormChange("dotStyle", value as DotType)
          }
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select pattern" />
          </SelectTrigger>
          <SelectContent>
            {DOT_STYLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2.5">
                  <span
                    className="rounded bg-white p-1 ring-1 ring-zinc-200"
                    aria-hidden
                  >
                    <span className="grid grid-cols-3 gap-[2px]">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <span
                          key={i}
                          style={{ backgroundColor: formState.fgColor }}
                          className={cn("h-[5px] w-[5px]", option.preview)}
                        />
                      ))}
                    </span>
                  </span>
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logo */}
      {(slugForLogo || workspaceLogoUrl) && (
        <div className="flex items-center justify-between">
          <Label htmlFor="qr-logo-toggle" className="text-[13px] font-medium">
            Workspace logo
          </Label>
          <Switch
            id="qr-logo-toggle"
            checked={formState.showLogo}
            onCheckedChange={(checked) => handleFormChange("showLogo", checked)}
            disabled={!workspaceLogoUrl}
            aria-label="Show workspace logo in QR code center"
          />
        </div>
      )}

      {/* Export size */}
      {/* <div className="space-y-2.5">
        <Label className="text-[13px] font-medium">Export size</Label>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((sizeOption) => {
            const active = formState.size === sizeOption;
            return (
              <button
                key={sizeOption}
                type="button"
                onClick={() => handleFormChange("size", sizeOption)}
                aria-pressed={active}
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "border-foreground bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {sizeOption}px
              </button>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          Higher resolution for print, smaller for web use.
        </p>
      </div> */}

      {/* Footer */}
      {!hideActions && (
        <div className="flex items-center justify-end gap-2 pt-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button disabled={isSaving || !isFormDirty} onClick={handleSave}>
              {isSaving && (
                <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
