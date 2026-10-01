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

    const clearContainer = () => {
      try {
        container.replaceChildren();
      } catch {
        // Children are fully owned by qr-code-styling, never by React — ignore.
      }
    };

    // No slug: clear the (always-mounted) container and drop the instance
    // so the next typed slug starts fresh. The container itself stays
    // mounted — React never unmounts a node the QR library has mutated.
    if (!options) {
      clearContainer();
      qrCodeRef.current = null;
      return;
    }

    // First slug: create once and append once.
    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options);
      if (container.isConnected !== false) {
        try {
          qrCodeRef.current.append(container);
        } catch {
          qrCodeRef.current = null;
        }
      }
      return;
    }

    // Subsequent keystrokes: update in place, never re-append.
    // Re-appending (clear + append) on every keystroke is what raced
    // React's commit and threw NotFoundError: removeChild.
    try {
      qrCodeRef.current.update(options);
    } catch {
      // If update fails (e.g. instance was torn down), recreate on next run.
      clearContainer();
      qrCodeRef.current = null;
    }
  }, [options]);

  useEffect(() => {
    return () => {
      try {
        containerRef.current?.replaceChildren();
      } catch {
        // Unmount path — ignore.
      }
      qrCodeRef.current = null;
    };
  }, []);

  return (
    <div className="relative flex aspect-[16/7] items-center justify-center rounded-lg border">
      {/* Always mounted: React must never unmount a node qr-code-styling
          has mutated — that was the removeChild crash on quick type+delete. */}
      <div
        ref={containerRef}
        className="flex h-[110px] w-[110px] items-center justify-center"
        style={slug ? undefined : { display: "none" }}
        aria-hidden={!slug}
        aria-label={slug ? `QR code for ${host}/${slug}` : undefined}
      />
      {!slug && (
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
