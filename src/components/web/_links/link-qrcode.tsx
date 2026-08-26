"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import QRCodeStyling, { type Options } from "qr-code-styling";
import { QrCode as QrCodeIcon } from "lucide-react";

type DotType = NonNullable<NonNullable<Options["dotsOptions"]>["type"]>;

const DOT_TYPES = new Set<string>([
  "square",
  "dots",
  "rounded",
  "classy",
  "classy-rounded",
  "extra-rounded",
]);

const PREVIEW_SIZE = 110;

/** Stored designer shape (from QRCodeDesign / DB), not full qr-code-styling Options. */
interface QrCustomization {
  fgColor?: string;
  size?: number;
  dotStyle?: DotType;
}

interface LinkQrCodeProps {
  code?: string;
  domain: string;
  customization?: QrCustomization | Partial<Options> | string | null;
}

function isDotType(value: unknown): value is DotType {
  return typeof value === "string" && DOT_TYPES.has(value);
}

function parseCustomization(
  input: LinkQrCodeProps["customization"],
): QrCustomization {
  if (!input) return {};

  let raw: Record<string, unknown> = {};
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        raw = parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  } else if (typeof input === "object") {
    raw = input as Record<string, unknown>;
  }

  const dots =
    raw.dotsOptions && typeof raw.dotsOptions === "object"
      ? (raw.dotsOptions as Record<string, unknown>)
      : null;

  const fgColor =
    (typeof raw.fgColor === "string" && raw.fgColor) ||
    (typeof dots?.color === "string" && dots.color) ||
    undefined;

  const dotStyle = isDotType(raw.dotStyle)
    ? raw.dotStyle
    : isDotType(dots?.type)
      ? dots.type
      : undefined;

  const size =
    typeof raw.size === "number"
      ? raw.size
      : typeof raw.width === "number"
        ? raw.width
        : undefined;

  return { fgColor, size, dotStyle };
}

function buildPreviewOptions(
  domain: string,
  code: string,
  customization: QrCustomization,
): Options {
  return {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    type: "svg",
    data: `https://${domain}/${code}?via=qr`,
    margin: 1.5,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "H",
    },
    dotsOptions: {
      type: customization.dotStyle ?? "square",
      color: customization.fgColor ?? "#000000",
    },
    backgroundOptions: {
      color: "#ffffff",
    },
  };
}

function LinkQrCode({ domain, code, customization }: LinkQrCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  const slug = code?.trim() ?? "";
  const host = domain?.trim() || "slugy.co";

  const options = useMemo(() => {
    if (!slug) return null;
    return buildPreviewOptions(host, slug, parseCustomization(customization));
  }, [slug, host, customization]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!options) {
      container.replaceChildren();
      qrCodeRef.current = null;
      return;
    }

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options);
    } else {
      qrCodeRef.current.update(options);
    }

    container.replaceChildren();
    qrCodeRef.current.append(container);

    return () => {
      container.replaceChildren();
    };
  }, [options]);

  useEffect(() => {
    return () => {
      qrCodeRef.current = null;
    };
  }, []);

  return (
    <div className="flex aspect-[16/7] items-center justify-center rounded-lg border">
      {slug ? (
        <div
          ref={containerRef}
          className="flex h-[110px] w-[110px] items-center justify-center"
          aria-label={`QR code for ${host}/${slug}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <QrCodeIcon
            strokeWidth={1.8}
            className="text-muted-foreground h-10 w-10"
            aria-hidden
          />
          <p className="text-muted-foreground text-center text-sm">
            Enter a short link to generate <br /> a QR code
          </p>
        </div>
      )}
      <span className="sr-only">QR code preview area</span>
    </div>
  );
}

export default memo(LinkQrCode);
