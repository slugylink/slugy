"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CampaignReport } from "@/lib/campaigns/report";
import { CampaignReportView } from "./report";

type Catalog = {
  campaigns: {
    id: string;
    name: string;
    status: string;
    _count: { links: number };
  }[];
  trafficSources: { id: string; name: string }[];
  links: {
    id: string;
    slug: string;
    domain: string;
    campaignId: string | null;
  }[];
  canSeeMoney: boolean;
};
async function fetcher(url: string) {
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
async function write(url: string, method: string, body: unknown, csv = false) {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": csv ? "text/csv" : "application/json" },
    body: csv ? String(body) : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function CampaignsClient({
  workspace,
  id,
}: {
  workspace: string;
  id?: string;
}) {
  const base = `/api/workspace/${encodeURIComponent(workspace)}/campaigns`;
  const router = useRouter();
  const catalog = useSWR<Catalog>(base, fetcher);
  const detail = useSWR<CampaignReport>(id ? `${base}/${id}` : null, fetcher);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [selected, setSelected] = useState<string[] | null>(null);
  const [showRevenue, setShowRevenue] = useState(false);
  const [showCost, setShowCost] = useState(false);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
      await Promise.all([catalog.mutate(), detail.mutate()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  if (catalog.error || detail.error)
    return (
      <p role="alert" className="p-8">
        {(catalog.error || detail.error).message}
      </p>
    );
  if (!catalog.data || (id && !detail.data))
    return <p className="p-8">Loading campaigns…</p>;
  const data = catalog.data;
  const report = detail.data;
  const inputClass = "rounded-md border bg-background p-2 text-sm";
  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 p-6">
      {id && (
        <Link href={`/${workspace}/campaigns`} className="text-sm underline">
          All campaigns
        </Link>
      )}
      <div>
        <h1 className="text-2xl font-semibold">
          {report?.campaign.name || "Campaigns"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Connect traffic, conversions, and spend in one report.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!id ? (
        <>
          <form
            className="flex flex-wrap items-end gap-3 rounded-xl border p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void run(async () => {
                const result = await write(base, "POST", {
                  name: form.get("name"),
                  slug: form.get("slug"),
                  trafficSourceId: form.get("source") || null,
                  costModel: form.get("costModel"),
                });
                router.push(`/${workspace}/campaigns/${result.id}`);
              });
            }}
          >
            <label className="space-y-2 text-sm">
              Name
              <Input
                name="name"
                required
                maxLength={120}
                placeholder="Autumn launch"
              />
            </label>
            <label className="space-y-2 text-sm">
              Slug
              <Input
                name="slug"
                required
                pattern="[a-z0-9][a-z0-9_-]*"
                maxLength={120}
                placeholder="autumn-launch"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Traffic source
              <select name="source" className={inputClass}>
                <option value="">Unspecified</option>
                {data.trafficSources.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              Cost model
              <select name="costModel" className={inputClass}>
                {["manual", "cpc", "cpm", "cpa"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <Button disabled={busy}>Create campaign</Button>
          </form>
          <div className="space-y-3">
            {data.campaigns.length ? (
              data.campaigns.map((c) => (
                <Link
                  key={c.id}
                  href={`/${workspace}/campaigns/${c.id}`}
                  className="hover:bg-muted flex justify-between rounded-xl border p-5"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {c.status} · {c._count.links} links
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center">
                Create your first campaign to start measuring conversions.
              </p>
            )}
          </div>
        </>
      ) : (
        report && (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm">
                Status{" "}
                <select
                  className={inputClass}
                  value={report.campaign.status}
                  disabled={busy}
                  onChange={(e) => {
                    const status = e.target.value;
                    void run(async () => {
                      await write(`${base}/${id}`, "PATCH", { status });
                    });
                  }}
                >
                  {["active", "paused", "archived"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={report.campaign.alertsEnabled}
                  disabled={busy}
                  onChange={(e) => {
                    const alertsEnabled = e.target.checked;
                    void run(async () => {
                      await write(`${base}/${id}`, "PATCH", { alertsEnabled });
                    });
                  }}
                />
                Email alerts
              </label>
              <a className="text-sm underline" href={`${base}/${id}/export`}>
                Export report CSV
              </a>
            </div>
            <CampaignReportView report={report} />
            <section className="space-y-4 rounded-xl border p-5">
              <h2 className="font-semibold">Campaign links</h2>
              <p className="text-muted-foreground text-sm">
                Assignment applies to future clicks. Selecting a link moves it
                from its current campaign.
              </p>
              <div className="grid max-h-64 gap-3 overflow-auto sm:grid-cols-2">
                {data.links.map((link) => (
                  <label
                    key={link.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={(
                        selected ?? report.links.map((l) => l.id)
                      ).includes(link.id)}
                      onChange={(e) => {
                        const current =
                          selected ?? report.links.map((l) => l.id);
                        setSelected(
                          e.target.checked
                            ? [...current, link.id]
                            : current.filter((i) => i !== link.id),
                        );
                      }}
                    />
                    {link.domain}/{link.slug}
                    {link.campaignId && link.campaignId !== id
                      ? " (another campaign)"
                      : ""}
                  </label>
                ))}
              </div>
              <Button
                disabled={busy || selected === null}
                onClick={() =>
                  void run(async () => {
                    await write(`${base}/${id}`, "PATCH", {
                      linkIds: selected,
                    });
                    setSelected(null);
                  })
                }
              >
                Save links
              </Button>
            </section>
            {data.canSeeMoney ? (
              <>
                <section className="space-y-4 rounded-xl border p-5">
                  <h2 className="font-semibold">Import spend</h2>
                  <p className="text-muted-foreground text-sm">
                    CSV columns: date,spend,currency,source. Dates use
                    YYYY-MM-DD. Matching date, currency, and source replaces the
                    previous spend.
                  </p>
                  <input
                    aria-label="Import spend CSV"
                    type="file"
                    accept=".csv,text/csv"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void run(async () => {
                          if (file.size > 250000)
                            throw new Error("CSV must be under 250 KB");
                          await write(
                            `${base}/${id}/costs`,
                            "POST",
                            await file.text(),
                            true,
                          );
                        });
                      e.target.value = "";
                    }}
                  />
                  <a
                    className="block text-sm underline"
                    href={`${base}/${id}/export?type=costs`}
                  >
                    Export spend CSV
                  </a>
                </section>
                <section className="space-y-4 rounded-xl border p-5">
                  <h2 className="font-semibold">Share report</h2>
                  <p className="text-muted-foreground text-sm">
                    Anyone with the link can view the report. Choose which
                    financial totals to include.
                  </p>
                  <label className="mr-5 text-sm">
                    <input
                      type="checkbox"
                      checked={showRevenue}
                      onChange={(e) => setShowRevenue(e.target.checked)}
                    />{" "}
                    Revenue
                  </label>
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      checked={showCost}
                      onChange={(e) => setShowCost(e.target.checked)}
                    />{" "}
                    Cost
                  </label>
                  <div className="flex gap-3">
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const result = await write(`${base}/${id}`, "PATCH", {
                            sharing: true,
                            showRevenue,
                            showCost,
                          });
                          setShareUrl(
                            `${window.location.origin}/share/campaigns/${result.shareToken}`,
                          );
                        })
                      }
                    >
                      Create or update share link
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await write(`${base}/${id}`, "PATCH", {
                            sharing: false,
                          });
                          setShareUrl("");
                        })
                      }
                    >
                      Revoke link
                    </Button>
                  </div>
                  {shareUrl && (
                    <Input
                      readOnly
                      aria-label="Shared report URL"
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  )}
                </section>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Revenue, spend, and shared reports require Growth.
              </p>
            )}
          </>
        )
      )}
    </main>
  );
}
