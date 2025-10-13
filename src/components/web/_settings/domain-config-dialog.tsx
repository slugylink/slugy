"use client";

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface CustomDomain {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string | null;
  dnsConfigured: boolean;
  cloudflareCnameTarget: string | null;
  cloudflareStatus: string | null;
}

interface DomainConfigContentProps {
  domain: CustomDomain;
}

// Inline domain configuration content (used inside accordion)
export function DomainConfigContent({ domain }: DomainConfigContentProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const isApexDomain =
    !domain.domain.includes("www") && domain.domain.split(".").length === 2;

  const getDnsRecords = () => {
    // Always use Vercel's CNAME target for SSL
    const cnameTarget = "cname.vercel-dns.com";

    if (isApexDomain) {
      return [
        {
          type: "A",
          name: "@",
          value: "76.76.21.21",
          description: "Points your apex domain to Vercel",
        },
        {
          type: "CNAME",
          name: "www",
          value: cnameTarget,
          description: "Points www subdomain to Vercel",
        },
      ];
    }

    return [
      {
        type: "CNAME",
        name: domain.domain.split(".")[0] || "@",
        value: cnameTarget,
        description: "Points your subdomain to Vercel (SSL handled by Vercel)",
      },
    ];
  };

  // Verification record for Vercel
  const verificationRecord = domain.verificationToken
    ? {
        type: "TXT",
        name: "_vercel",
        value: domain.verificationToken,
      }
    : null;

  const dnsRecords = getDnsRecords();

  return (
    <div className="mt-4 space-y-6">
      {/* TXT Verification is skipped for Cloudflare DNS - users only need CNAME */}

      {/* Step 2: DNS Configuration */}
      <div className="p-3 pb-0 sm:p-4">
        <p className="text-muted-foreground mb-4 text-sm">
          Set the following records on your DNS provider:
        </p>

        {/* Desktop/tablet table */}
        <div className="hidden overflow-x-auto rounded-md border sm:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 text-sm font-medium">Type</th>
                <th className="px-4 py-2 text-sm font-medium">Name</th>
                <th className="px-4 py-2 text-sm font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {dnsRecords.map((record, index) => (
                <tr key={index} className="border-t text-sm">
                  <td className="px-4 py-3 text-sm">{record.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{record.name}</span>
                      <button
                        className="cursor-pointer"
                        onClick={() =>
                          copyToClipboard(record.name, `dns-name-${index}`)
                        }
                      >
                        {copiedField === `dns-name-${index}` ? (
                          <Check className="size-[14px] text-green-500" />
                        ) : (
                          <Copy className="size-[14px]" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-mono break-all">
                        {record.value}
                      </span>
                      <button
                        className="cursor-pointer"
                        onClick={() =>
                          copyToClipboard(record.value, `dns-value-${index}`)
                        }
                      >
                        {copiedField === `dns-value-${index}` ? (
                          <Check className="size-[14px] text-green-500" />
                        ) : (
                          <Copy className="size-[14px]" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {verificationRecord && (
                <tr className="border-t text-sm">
                  <td className="px-4 py-3 text-sm">
                    {verificationRecord.type}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {verificationRecord.name}
                      </span>
                      <button
                        className="cursor-pointer"
                        onClick={() =>
                          copyToClipboard(
                            verificationRecord.name,
                            `verification-name`,
                          )
                        }
                      >
                        {copiedField === `verification-name` ? (
                          <Check className="size-[14px] text-green-500" />
                        ) : (
                          <Copy className="size-[14px]" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs break-all sm:text-sm">
                        {verificationRecord.value}
                      </span>
                      <button
                        className="cursor-pointer"
                        onClick={() =>
                          copyToClipboard(
                            verificationRecord.value,
                            `verification-value`,
                          )
                        }
                      >
                        {copiedField === `verification-value` ? (
                          <Check className="size-[14px] text-green-500" />
                        ) : (
                          <Copy className="size-[14px]" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked list */}
        <div className="space-y-3 sm:hidden">
          {dnsRecords.map((record, index) => (
            <div key={index} className="rounded-md border p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground min-w-14 text-[11px]">
                    Name
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-2">
                    <span className="font-mono text-xs">{record.name}</span>
                    <button
                      className="cursor-pointer"
                      onClick={() =>
                        copyToClipboard(record.name, `dns-name-${index}`)
                      }
                    >
                      {copiedField === `dns-name-${index}` ? (
                        <Check className="size-[14px] text-green-500" />
                      ) : (
                        <Copy className="size-[14px]" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-muted-foreground min-w-14 pt-1 text-[11px]">
                    Value
                  </div>
                  <div className="flex flex-1 items-start justify-between gap-2">
                    <span className="line-clamp-1 font-mono text-xs break-all">
                      {record.value}
                    </span>
                    <button
                      className="cursor-pointer"
                      onClick={() =>
                        copyToClipboard(record.value, `dns-value-${index}`)
                      }
                    >
                      {copiedField === `dns-value-${index}` ? (
                        <Check className="size-[14px] text-green-500" />
                      ) : (
                        <Copy className="size-[14px]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {verificationRecord && (
            <div className="rounded-md border p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-muted-foreground min-w-14 text-[11px]">
                    Name
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-2">
                    <span className="line-clamp-1 font-mono text-xs">
                      {verificationRecord.name}
                    </span>
                    <button
                      className="cursor-pointer"
                      onClick={() =>
                        copyToClipboard(
                          verificationRecord.name,
                          `verification-name`,
                        )
                      }
                    >
                      {copiedField === `verification-name` ? (
                        <Check className="size-[14px] text-green-500" />
                      ) : (
                        <Copy className="size-[14px]" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-muted-foreground min-w-14 pt-1 text-[11px]">
                    Value
                  </div>
                  <div className="flex flex-1 items-start justify-between gap-2">
                    <span className="font-mono text-xs break-all">
                      {verificationRecord.value}
                    </span>
                    <button
                      className="cursor-pointer"
                      onClick={() =>
                        copyToClipboard(
                          verificationRecord.value,
                          `verification-value`,
                        )
                      }
                    >
                      {copiedField === `verification-value` ? (
                        <Check className="size-[14px] text-green-500" />
                      ) : (
                        <Copy className="size-[14px]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
