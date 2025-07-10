"use client";
import React, { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import QRCodeStyling, { type Options } from "qr-code-styling";
import { QrCode as QrCodeIcon } from "lucide-react"; // Assuming you have a fallback QrCode icon

const qrOptions: Options = {
  width: 200,
  height: 200,
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
    color: "#4267B2",
  },
  backgroundOptions: {
    color: "#ffffff",
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
}

const LinkQrCode: React.FC<LinkQrCodeProps> = ({ code }) => {
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQrCode(new QRCodeStyling(qrOptions));
    }
  }, []);

  useEffect(() => {
    if (qrCode && qrRef.current && code) {
      qrRef.current.innerHTML = "";
      qrCode.update({
        data: `https://slugy.co/${code}`,
      });
      qrCode.append(qrRef.current);
    }
  }, [qrCode, code]);

  return (
    <div className="flex aspect-[16/7] items-center justify-center rounded-lg border">
      {code ? (
        <div className="aspect-video">
          <QRCode value={`https://slugy.co/${code}`} size={90} />
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
