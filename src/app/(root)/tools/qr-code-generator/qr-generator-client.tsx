"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCodeStyling, { type DotType } from "qr-code-styling";
import {
  Link2,
  Type,
  Wifi,
  Mail,
  Download,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ScanLine,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PayloadTab = "url" | "text" | "wifi" | "email";

const TABS: Array<{ value: PayloadTab; label: string; icon: typeof Link2 }> = [
  { value: "url", label: "Link", icon: Link2 },
  { value: "text", label: "Text", icon: Type },
  { value: "wifi", label: "Wi-Fi", icon: Wifi },
  { value: "email", label: "Email", icon: Mail },
];

const DOT_STYLES: Array<{ value: DotType; label: string; preview: string }> = [
  { value: "square", label: "Square", preview: "rounded-[2px]" },
  { value: "dots", label: "Dots", preview: "rounded-full" },
  { value: "rounded", label: "Rounded", preview: "rounded-[5px]" },
  { value: "classy", label: "Classy", preview: "rounded-[2px_6px_2px_6px]" },
  { value: "extra-rounded", label: "Soft", preview: "rounded-[7px]" },
];

const SWATCHES = [
  "#000000",
  "#1d4ed8",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
] as const;

const SIZES = [512, 1024, 2048] as const;

function buildWifiString(ssid: string, password: string, encryption: string) {
  const esc = (s: string) => s.replace(/([\\;,":])/g, "\\$1");
  return `WIFI:T:${encryption};S:${esc(ssid)};P:${esc(password)};;`;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
      {children}
    </p>
  );
}

export default function QrGeneratorClient({
  faqs,
}: {
  faqs: Array<{ q: string; a: string }>;
}) {
  const [tab, setTab] = useState<PayloadTab>("url");
  const [url, setUrl] = useState("https://slugy.co");
  const [text, setText] = useState(
    "Hello from Slugy — free QR codes, no login.",
  );
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [encryption, setEncryption] = useState("WPA");
  const [email, setEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [dotStyle, setDotStyle] = useState<DotType>("extra-rounded");
  const [size, setSize] = useState<number>(1024);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<"png" | "svg" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  const payload = useMemo(() => {
    switch (tab) {
      case "url":
        return normalizeUrl(url) || "https://slugy.co";
      case "text":
        return text.trim() || "Slugy";
      case "wifi":
        return ssid.trim()
          ? buildWifiString(ssid.trim(), wifiPassword, encryption)
          : "WIFI:T:WPA;S:;P:;;";
      case "email": {
        const addr = email.trim();
        if (!addr) return "mailto:hello@slugy.co";
        const params = new URLSearchParams();
        if (emailSubject.trim()) params.set("subject", emailSubject.trim());
        const qs = params.toString();
        return `mailto:${addr}${qs ? `?${qs}` : ""}`;
      }
    }
  }, [tab, url, text, ssid, wifiPassword, encryption, email, emailSubject]);

  const isPayloadValid = useMemo(() => {
    if (tab === "url") {
      try {
        const u = new URL(normalizeUrl(url));
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    }
    if (tab === "email") return /.+@.+\..+/.test(email.trim());
    if (tab === "wifi") return ssid.trim().length > 0;
    return text.trim().length > 0;
  }, [tab, url, email, ssid, text]);

  const shortPayload = useMemo(
    () => (payload.length > 64 ? `${payload.slice(0, 60)}…` : payload),
    [payload],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const options = {
      width: 264,
      height: 264,
      type: "svg" as const,
      data: payload,
      margin: 1,
      qrOptions: {
        typeNumber: 0 as const,
        mode: "Byte" as const,
        errorCorrectionLevel: "H" as const,
      },
      backgroundOptions: { color: bgColor },
      dotsOptions: { color: fgColor, type: dotStyle },
      cornersSquareOptions: { color: fgColor, type: "extra-rounded" as const },
      cornersDotOptions: { color: fgColor, type: "dot" as const },
    };
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options);
      containerRef.current.replaceChildren();
      qrRef.current.append(containerRef.current);
    } else {
      qrRef.current.update(options);
    }
  }, [payload, fgColor, bgColor, dotStyle]);

  const download = useCallback(
    async (ext: "png" | "svg") => {
      if (!qrRef.current || downloading) return;
      setDownloading(ext);
      try {
        qrRef.current.update({ width: size, height: size });
        const blob =
          ext === "svg"
            ? await qrRef.current.getRawData("svg")
            : await qrRef.current.getRawData("png");
        if (!blob) throw new Error("Export failed");
        const file = new Blob([blob as BlobPart], {
          type: ext === "svg" ? "image/svg+xml" : "image/png",
        });
        const objectUrl = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `slugy-qr-${size}px.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        toast.success(`QR code downloaded as ${ext.toUpperCase()}`);
      } catch {
        toast.error("Could not export QR code. Try again.");
      } finally {
        qrRef.current?.update({ width: 264, height: 264 });
        setDownloading(null);
      }
    },
    [size, downloading],
  );

  const copyPayload = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — select the text manually.");
    }
  }, [payload]);

  const activeTab = TABS.find((t) => t.value === tab)!;

  return (
    <>
      {/* Breadcrumb + hero — Dub-style: tight, left-aligned, minimal */}
      <section className="mx-auto max-w-5xl px-4 pt-10 sm:pt-14">
        <nav
          aria-label="Breadcrumb"
          className="text-muted-foreground flex items-center gap-1.5 text-[13px]"
        >
          <Link
            href="/tools"
            className="hover:text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Tools
            </span>
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">QR Code Generator</span>
        </nav>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl leading-[1.15] font-medium tracking-tight text-balance sm:text-[32px]">
              Free QR Code Generator
            </h1>
            <p className="text-muted-foreground mt-2.5 max-w-xl text-[15px] leading-relaxed">
              Create a custom QR code for a link, text, Wi-Fi or email. Style
              it, preview it live, download print-ready files. No account, no
              watermark.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">No login</Badge>
            <Badge variant="secondary">PNG + SVG</Badge>
            <Badge variant="secondary">100% private</Badge>
          </div>
        </div>
      </section>

      {/* Tool — Dub-style single panel: controls left, sticky preview right */}
      <section className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="grid lg:grid-cols-[1fr_340px]">
            {/* ------- Controls ------- */}
            <div className="flex flex-col gap-7 p-5 sm:p-7">
              {/* Content type — segmented control like Dub */}
              <div className="space-y-3">
                <SectionLabel>1 · Content</SectionLabel>
                <div
                  role="tablist"
                  aria-label="QR content type"
                  className="bg-muted grid grid-cols-4 gap-1 rounded-xl p-1"
                >
                  {TABS.map((t) => {
                    const active = t.value === tab;
                    return (
                      <button
                        key={t.value}
                        role="tab"
                        aria-selected={active}
                        onClick={() => setTab(t.value)}
                        className={cn(
                          "flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-medium transition-all",
                          active
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <t.icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t.label}</span>
                        <span className="sm:hidden">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {tab === "url" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-url" className="text-[13px]">
                      Destination URL
                    </Label>
                    <div className="relative">
                      <Link2 className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        id="qr-url"
                        inputMode="url"
                        placeholder="https://your-site.com/summer-sale"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="h-11 pl-9"
                        aria-invalid={!isPayloadValid}
                      />
                    </div>
                    {!isPayloadValid ? (
                      <p className="text-destructive text-xs">
                        Enter a valid link starting with http(s)://
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Tip: shorten it with Slugy first to make it editable and
                        trackable.
                      </p>
                    )}
                  </div>
                )}

                {tab === "text" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-text" className="text-[13px]">
                      Text content
                    </Label>
                    <Textarea
                      id="qr-text"
                      rows={3}
                      placeholder="Coupon code, invite message, menu note…"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                )}

                {tab === "wifi" && (
                  <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                    <div className="space-y-1.5">
                      <Label htmlFor="qr-ssid" className="text-[13px]">
                        Network name
                      </Label>
                      <Input
                        id="qr-ssid"
                        placeholder="Cafe-Guest"
                        value={ssid}
                        onChange={(e) => setSsid(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Security</Label>
                      <Select value={encryption} onValueChange={setEncryption}>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WPA">WPA / WPA2</SelectItem>
                          <SelectItem value="WEP">WEP</SelectItem>
                          <SelectItem value="nopass">Open</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {encryption !== "nopass" && (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="qr-wifi-pass" className="text-[13px]">
                          Password
                        </Label>
                        <Input
                          id="qr-wifi-pass"
                          autoComplete="off"
                          placeholder="Network password"
                          value={wifiPassword}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    )}
                  </div>
                )}

                {tab === "email" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="qr-email" className="text-[13px]">
                        Email address
                      </Label>
                      <Input
                        id="qr-email"
                        inputMode="email"
                        placeholder="hello@yourbrand.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="qr-email-subject" className="text-[13px]">
                        Subject{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="qr-email-subject"
                        placeholder="Get 20% off this week"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t" />

              {/* Design */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <SectionLabel>2 · Design</SectionLabel>
                  <span className="text-muted-foreground text-xs">
                    Live preview →
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px]">Pattern</Label>
                  <Select
                    value={dotStyle}
                    onValueChange={(v) => setDotStyle(v as DotType)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOT_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <span className="flex items-center gap-2.5">
                            <span
                              className="rounded bg-white p-1 ring-1 ring-zinc-200"
                              aria-hidden
                            >
                              <span className="grid grid-cols-3 gap-[2px]">
                                {Array.from({ length: 9 }).map((_, i) => (
                                  <span
                                    key={i}
                                    style={{ backgroundColor: fgColor }}
                                    className={cn("h-[5px] w-[5px]", s.preview)}
                                  />
                                ))}
                              </span>
                            </span>
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[13px]">QR color</Label>
                    <div className="flex items-center gap-1.5">
                      {SWATCHES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Use ${c}`}
                          onClick={() => setFgColor(c)}
                          style={{ backgroundColor: c }}
                          className={cn(
                            "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all",
                            fgColor === c
                              ? "ring-foreground ring-offset-background ring-2 ring-offset-2"
                              : "ring-1 ring-black/10 hover:scale-105 dark:ring-white/20",
                          )}
                        >
                          {fgColor === c && (
                            <Check className="h-3.5 w-3.5 text-white mix-blend-difference" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/20"
                        style={{ backgroundColor: fgColor }}
                      >
                        <input
                          type="color"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="h-full w-full cursor-pointer opacity-0"
                          aria-label="Custom QR color"
                        />
                      </div>
                      <Input
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="h-8 font-mono text-xs uppercase"
                        maxLength={7}
                        aria-label="QR color hex"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[13px]">Background</Label>
                    <div className="flex items-center gap-1.5">
                      {["#ffffff", "#f4f4f5", "#000000", "#1d4ed8"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Background ${c}`}
                          onClick={() => setBgColor(c)}
                          style={{ backgroundColor: c }}
                          className={cn(
                            "h-8 w-8 cursor-pointer rounded-full transition-all",
                            bgColor === c
                              ? "ring-foreground ring-offset-background ring-2 ring-offset-2"
                              : "ring-1 ring-black/10 hover:scale-105 dark:ring-white/20",
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/20"
                        style={{ backgroundColor: bgColor }}
                      >
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="h-full w-full cursor-pointer opacity-0"
                          aria-label="Custom background color"
                        />
                      </div>
                      <Input
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="h-8 font-mono text-xs uppercase"
                        maxLength={7}
                        aria-label="Background color hex"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t" />

              {/* Export size */}
              <div className="space-y-3">
                <SectionLabel>3 · Export size</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      aria-pressed={size === s}
                      className={cn(
                        "cursor-pointer rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-all",
                        size === s
                          ? "border-foreground bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      {s}px
                      <span className="ml-1.5 font-normal opacity-60">
                        {s === 512 ? "Web" : s === 1024 ? "Print" : "Large"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ------- Preview (Dub-style muted rail) ------- */}
            <div className="bg-muted/60 flex flex-col border-t lg:border-t-0 lg:border-l">
              <div className="flex flex-1 flex-col items-center gap-4 p-5 sm:p-7">
                <div className="flex w-full items-center justify-between">
                  <SectionLabel>Preview</SectionLabel>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium",
                      isPayloadValid
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isPayloadValid ? "bg-emerald-500" : "bg-amber-500",
                      )}
                    />
                    {isPayloadValid
                      ? ` ready · ${activeTab.label}`
                      : "check input"}
                  </span>
                </div>

                <div className="bg-background w-full rounded-2xl border p-4 shadow-sm">
                  <div
                    ref={containerRef}
                    className="mx-auto flex aspect-square w-full max-w-[264px] items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>svg]:rounded-lg"
                    role="img"
                    aria-label="QR code preview"
                  />
                </div>

                <button
                  onClick={copyPayload}
                  className="group bg-background hover:border-foreground/30 flex w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors"
                  title="Copy full payload"
                >
                  <ScanLine className="text-muted-foreground h-4 w-4 shrink-0" />
                  <code className="min-w-0 flex-1 truncate text-xs">
                    {shortPayload}
                  </code>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Copy className="text-muted-foreground h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </button>

                <div className="grid w-full gap-2">
                  <Button
                    onClick={() => download("png")}
                    disabled={!isPayloadValid || downloading !== null}
                    className="h-10 w-full"
                  >
                    {downloading === "png" ? (
                      "Rendering…"
                    ) : (
                      <>
                        <Download className="h-4 w-4" /> Download PNG · {size}px
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => download("svg")}
                    disabled={!isPayloadValid || downloading !== null}
                    className="bg-background h-10 w-full"
                  >
                    {downloading === "svg" ? (
                      "Rendering…"
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" /> SVG vector
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed">
                  <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
                  Rendered locally in your browser. Nothing is uploaded or
                  tracked.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Steps — Dub-style numbered row */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              n: "01",
              t: "Add content",
              d: "Paste a link, text, Wi-Fi or email. Validation is instant.",
            },
            {
              n: "02",
              t: "Match your brand",
              d: "Pick a pattern, foreground and background with safe contrast.",
            },
            {
              n: "03",
              t: "Download & print",
              d: "Export PNG for print or SVG for infinite scaling.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="bg-card rounded-2xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <p className="text-muted-foreground font-mono text-xs">{s.n}</p>
              <p className="mt-1 text-sm font-medium">{s.t}</p>
              <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SEO copy — tighter, Dub-like */}
      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="grid gap-8 rounded-2xl border bg-zinc-50/60 p-6 sm:p-8 md:grid-cols-[220px_1fr] dark:bg-zinc-900/40">
          <h2 className="text-base font-medium tracking-tight">
            When to use each format
          </h2>
          <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
            <div>
              <p className="text-foreground font-medium">Link QR codes</p>
              <p className="mt-0.5">
                Packaging, posters, receipts, event signage — anywhere typing
                fails. Shorten the destination with Slugy first so you can edit
                it later without reprinting.
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Wi-Fi QR codes</p>
              <p className="mt-0.5">
                Cafés, Airbnbs, offices. Guests scan and join instantly instead
                of typing long passwords at the counter.
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Email & text codes</p>
              <p className="mt-0.5">
                Pre-fill a message for support desks, review requests and
                referral cards — higher response rates than a bare address.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-10">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
          FAQ
        </p>
        <h2 className="mt-2 text-xl font-medium tracking-tight">
          QR generator questions
        </h2>
        <Accordion type="single" collapsible className="mt-4">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-[15px] hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
