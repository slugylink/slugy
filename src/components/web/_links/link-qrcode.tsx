"use client";

import { useEffect, useMemo, useRef } from "react";
import QRCodeStyling, { type Options } from "qr-code-styling";
import { QrCode as QrCodeIcon } from "lucide-react";

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
  width: 110,
  height: 110,
  type: "svg",
  data: "",
  margin: 1.5,
  qrOptions: {
    typeNumber: 0,
    mode: "Byte",
    errorCorrectionLevel: "H",
  },
  dotsOptions: {
    type: "square",
    color: "#000000",
  },
  backgroundOptions: {
    color: "#ffffff",
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

const LinkQrCode = ({ domain, code, customization }: LinkQrCodeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  const mergedOptions = useMemo(() => {
    if (!code) return null;

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
      data: `https://${domain}/${code}?ref=qr`,
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
      backgroundOptions: {
        ...DEFAULT_OPTIONS.backgroundOptions,
        ...(custom.backgroundOptions || {}),
      },
    };
  }, [code, customization, domain]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!code || !mergedOptions) {
      containerRef.current.replaceChildren();
      return;
    }

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(mergedOptions);
    } else {
      qrCodeRef.current.update(mergedOptions);
    }

    containerRef.current.replaceChildren();
    qrCodeRef.current.append(containerRef.current);
  }, [code, mergedOptions]);

  useEffect(() => {
    return () => {
      qrCodeRef.current = null;
    };
  }, []);

  return (
    <div className="flex aspect-[16/7] items-center justify-center rounded-lg border">
      {code ? (
        <div
          ref={containerRef}
          className="flex h-[110px] w-[110px] items-center justify-center"
        />
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
