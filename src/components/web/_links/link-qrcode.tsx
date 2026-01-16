"use client";

import QRCode from "react-qr-code";
import { QrCode as QrCodeIcon } from "lucide-react";
import type { Options } from "qr-code-styling";

type DotType = NonNullable<Options["dotsOptions"]>["type"];
const DOT_TYPES: DotType[] = [
  "square",
  "dots",
  "rounded",
  "classy",
  "classy-rounded",
  "extra-rounded",
];

const DEFAULT_OPTIONS: Options = {
  width: 220,
  height: 220,
  type: "svg",
  data: "",
  image: "",
  margin: 10,
  qrOptions: {
    typeNumber: 0,
    mode: "Byte",
    errorCorrectionLevel: "H",
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.4,
    margin: 0,
    crossOrigin: "anonymous",
  },
  dotsOptions: {
    type: "rounded",
    color: "#000",
  },
  backgroundOptions: {
    color: "#fff",
  },
  cornersSquareOptions: {
    type: "extra-rounded",
    color: "#4267B2",
  },
  cornersDotOptions: {
    type: "dot",
    color: "#4267B2",
  },
};

interface LinkQrCodeProps {
  code?: string;
  domain: string;
  /**
   * Customization can be a JSON string or a partial Options object.
   */
  customization?: Partial<Options> | string;
}

function isDotType(val: unknown): val is DotType {
  return typeof val === "string" && DOT_TYPES.includes(val as DotType);
}

const LinkQrCode = ({
  domain,
  code,
  customization,
}: LinkQrCodeProps) => {
  const mergedOptions = (() => {
    let custom: Partial<Options> = {};
    if (customization) {
      if (typeof customization === "string") {
        try {
          custom = JSON.parse(customization);
        } catch {
          // ignore parse error
        }
      } else {
        custom = customization;
      }
    }
    const customObj = custom as Record<string, unknown>;
    const dotsOptions = {
      ...DEFAULT_OPTIONS.dotsOptions,
      ...(custom.dotsOptions || {}),
      ...(typeof customObj.fgColor === "string"
        ? { color: customObj.fgColor }
        : {}),
      ...(isDotType(customObj.dotStyle) ? { type: customObj.dotStyle } : {}),
    };
    return {
      ...DEFAULT_OPTIONS,
      ...custom,
      width:
        typeof customObj.size === "number"
          ? customObj.size
          : typeof customObj.width === "number"
            ? customObj.width
            : DEFAULT_OPTIONS.width,
      height:
        typeof customObj.size === "number"
          ? customObj.size
          : typeof customObj.height === "number"
            ? customObj.height
            : DEFAULT_OPTIONS.height,
      dotsOptions,
      cornersSquareOptions: {
        ...DEFAULT_OPTIONS.cornersSquareOptions,
        ...(custom.cornersSquareOptions || {}),
      },
      cornersDotOptions: {
        ...DEFAULT_OPTIONS.cornersDotOptions,
        ...(custom.cornersDotOptions || {}),
      },
      backgroundOptions: {
        ...DEFAULT_OPTIONS.backgroundOptions,
        ...(custom.backgroundOptions || {}),
      },
    };
  })();

  return (
    <div className="flex aspect-[16/7] items-center justify-center rounded-lg border">
      {code ? (
        <div>
          <QRCode
            value={`https://${domain}/${code}`}
            size={90}
            fgColor={mergedOptions.dotsOptions?.color}
            bgColor={mergedOptions.backgroundOptions?.color}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <QrCodeIcon
            strokeWidth={1.8}
            className="text-muted-foreground h-10 w-10"
          />
          <p className="text-muted-foreground text-center text-sm">
            Enter a short link to generate <br /> a QR code
          </p>
        </div>
      )}
      <span className="sr-only">QR code preview area</span>
    </div>
  );
};

export default LinkQrCode;
