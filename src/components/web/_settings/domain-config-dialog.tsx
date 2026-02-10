"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

// Constants
const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";
const VERCEL_A_RECORD_IP = "76.76.21.21";
const COPY_FEEDBACK_DURATION = 2000;

// Types
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

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  description: string;
}

interface VerificationRecord {
  type: string;
  name: string;
  value: string;
}

// Utility functions
const isApexDomain = (domain: string): boolean => {
  return !domain.includes("www") && domain.split(".").length === 2;
};

const getDnsRecords = (domain: string): DnsRecord[] => {
  if (isApexDomain(domain)) {
    return [
      {
        type: "A",
        name: "@",
        value: VERCEL_A_RECORD_IP,
        description: "Points your apex domain to Vercel",
      },
      {
        type: "CNAME",
        name: "www",
        value: VERCEL_CNAME_TARGET,
        description: "Points www subdomain to Vercel",
      },
    ];
  }

  return [
    {
      type: "CNAME",
      name: domain.split(".")[0] || "@",
      value: VERCEL_CNAME_TARGET,
      description: "Points your subdomain to Vercel (SSL handled by Vercel)",
    },
  ];
};

// Sub-components
interface CopyButtonProps {
  text: string;
  fieldId: string;
  copiedField: string | null;
  onCopy: (text: string, fieldId: string) => void;
}

const CopyButton = ({
  text,
  fieldId,
  copiedField,
  onCopy,
}: CopyButtonProps) => {
  const isCopied = copiedField === fieldId;

  return (
    <button
      type="button"
      className="cursor-pointer"
      onClick={() => onCopy(text, fieldId)}
      aria-label={isCopied ? "Copied" : "Copy to clipboard"}
    >
      {isCopied ? (
        <Check className="size-[14px] text-green-500" />
      ) : (
        <Copy className="size-[14px]" />
      )}
    </button>
  );
};

interface DnsRecordRowProps {
  record: DnsRecord;
  index: number;
  copiedField: string | null;
  onCopy: (text: string, fieldId: string) => void;
}

const DnsRecordRow = ({
  record,
  index,
  copiedField,
  onCopy,
}: DnsRecordRowProps) => (
  <tr className="border-t text-sm">
    <td className="px-4 py-3 text-sm">{record.type}</td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="font-mono">{record.name}</span>
        <CopyButton
          text={record.name}
          fieldId={`dns-name-${index}`}
          copiedField={copiedField}
          onCopy={onCopy}
        />
      </div>
    </td>
    <td className="px-4 py-3 align-top">
      <div className="flex items-center gap-2">
        <span className="font-mono break-all">{record.value}</span>
        <CopyButton
          text={record.value}
          fieldId={`dns-value-${index}`}
          copiedField={copiedField}
          onCopy={onCopy}
        />
      </div>
    </td>
  </tr>
);

interface VerificationRecordRowProps {
  record: VerificationRecord;
  copiedField: string | null;
  onCopy: (text: string, fieldId: string) => void;
}

const VerificationRecordRow = ({
  record,
  copiedField,
  onCopy,
}: VerificationRecordRowProps) => (
  <tr className="border-t text-sm">
    <td className="px-4 py-3 text-sm">{record.type}</td>
    <td className="px-4 py-3 align-top">
      <div className="flex items-center gap-2">
        <span className="font-mono">{record.name}</span>
        <CopyButton
          text={record.name}
          fieldId="verification-name"
          copiedField={copiedField}
          onCopy={onCopy}
        />
      </div>
    </td>
    <td className="px-4 py-3 align-top">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs break-all sm:text-sm">
          {record.value}
        </span>
        <CopyButton
          text={record.value}
          fieldId="verification-value"
          copiedField={copiedField}
          onCopy={onCopy}
        />
      </div>
    </td>
  </tr>
);

interface MobileDnsRecordProps {
  record: DnsRecord;
  index: number;
  copiedField: string | null;
  onCopy: (text: string, fieldId: string) => void;
}

const MobileDnsRecord = ({
  record,
  index,
  copiedField,
  onCopy,
}: MobileDnsRecordProps) => (
  <div className="rounded-md border p-3">
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-muted-foreground min-w-14 text-[11px]">Name</div>
        <div className="flex flex-1 items-center justify-between gap-2">
          <span className="font-mono text-xs">{record.name}</span>
          <CopyButton
            text={record.name}
            fieldId={`dns-name-${index}`}
            copiedField={copiedField}
            onCopy={onCopy}
          />
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
          <CopyButton
            text={record.value}
            fieldId={`dns-value-${index}`}
            copiedField={copiedField}
            onCopy={onCopy}
          />
        </div>
      </div>
    </div>
  </div>
);

interface MobileVerificationRecordProps {
  record: VerificationRecord;
  copiedField: string | null;
  onCopy: (text: string, fieldId: string) => void;
}

const MobileVerificationRecord = ({
  record,
  copiedField,
  onCopy,
}: MobileVerificationRecordProps) => (
  <div className="rounded-md border p-3">
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-muted-foreground min-w-14 text-[11px]">Name</div>
        <div className="flex flex-1 items-center justify-between gap-2">
          <span className="line-clamp-1 font-mono text-xs">{record.name}</span>
          <CopyButton
            text={record.name}
            fieldId="verification-name"
            copiedField={copiedField}
            onCopy={onCopy}
          />
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="text-muted-foreground min-w-14 pt-1 text-[11px]">
          Value
        </div>
        <div className="flex flex-1 items-start justify-between gap-2">
          <span className="font-mono text-xs break-all">{record.value}</span>
          <CopyButton
            text={record.value}
            fieldId="verification-value"
            copiedField={copiedField}
            onCopy={onCopy}
          />
        </div>
      </div>
    </div>
  </div>
);

// Main component
export function DomainConfigContent({ domain }: DomainConfigContentProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedField(null), COPY_FEEDBACK_DURATION);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const dnsRecords = getDnsRecords(domain.domain);
  const verificationRecord: VerificationRecord | null = domain.verificationToken
    ? {
        type: "TXT",
        name: "_vercel",
        value: domain.verificationToken,
      }
    : null;

  return (
    <div className="mt-4 space-y-6">
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
                <DnsRecordRow
                  key={index}
                  record={record}
                  index={index}
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              ))}
              {verificationRecord && (
                <VerificationRecordRow
                  record={verificationRecord}
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked list */}
        <div className="space-y-3 sm:hidden">
          {dnsRecords.map((record, index) => (
            <MobileDnsRecord
              key={index}
              record={record}
              index={index}
              copiedField={copiedField}
              onCopy={copyToClipboard}
            />
          ))}
          {verificationRecord && (
            <MobileVerificationRecord
              record={verificationRecord}
              copiedField={copiedField}
              onCopy={copyToClipboard}
            />
          )}
        </div>
      </div>
    </div>
  );
}
