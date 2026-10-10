import type { CampaignReport } from "@/lib/campaigns/report";

export function CampaignReportView({ report }: { report: CampaignReport }) {
  const percent = (value: number | null) =>
    value === null ? "—" : `${value.toFixed(1)}%`;
  const number = (value: number | null) =>
    value === null
      ? "—"
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Clicks", report.clicks],
          ["Visitors (IP)", report.visitors],
          ["Leads", report.leads],
          ["Sales", report.sales],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border p-5">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value ?? "—"}</p>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        All time · Clicks: {report.clickSource}. Leads count unique customers
        with a non-sale conversion.
      </p>
      {report.money.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {["Currency", "Revenue", "Spend", "ROAS", "CPA"].map((h) => (
                  <th className="p-4" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.money.map((row) => (
                <tr className="border-t" key={row.currency}>
                  <td className="p-4">{row.currency}</td>
                  <td className="p-4">{number(row.revenue)}</td>
                  <td className="p-4">{number(row.spend)}</td>
                  <td className="p-4">
                    {row.roas === null ? "—" : `${number(row.roas)}×`}
                  </td>
                  <td className="p-4">{number(row.cpa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-xl border p-5">
        <h2 className="font-semibold">Traffic quality</h2>
        <div className="mt-4 flex flex-wrap gap-8">
          <p>
            Bot traffic <strong>{percent(report.quality.botPercent)}</strong>
          </p>
          <p>
            Duplicates{" "}
            <strong>{percent(report.quality.duplicatePercent)}</strong>
          </p>
          <p>
            Conversion click matches{" "}
            <strong>{percent(report.quality.joinRate)}</strong>
          </p>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">
          Based on {report.quality.measured.toLocaleString()} scored clicks
          processed into Postgres. Older unscored clicks are excluded.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(
          [
            ["Devices", report.quality.devices],
            ["Browsers", report.quality.browsers],
            ["Countries", report.quality.countries],
          ] as const
        ).map(([label, rows]) => (
          <div key={label} className="rounded-xl border p-5">
            <h2 className="font-semibold">Converting {label.toLowerCase()}</h2>
            {rows.length ? (
              rows.slice(0, 10).map((row) => (
                <p key={row.name} className="mt-3 flex justify-between text-sm">
                  <span>{row.name}</span>
                  <span>{row.conversions}</span>
                </p>
              ))
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                No matched conversions yet.
              </p>
            )}
          </div>
        ))}
      </div>
      {report.costs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <caption className="p-4 text-left font-semibold">
              Spend history
            </caption>
            <thead>
              <tr>
                {["Date", "Source", "Currency", "Spend"].map((h) => (
                  <th className="p-4" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.costs.map((row) => (
                <tr
                  key={`${row.date}:${row.source}:${row.currency}`}
                  className="border-t"
                >
                  <td className="p-4">{row.date}</td>
                  <td className="p-4">{row.source}</td>
                  <td className="p-4">{row.currency}</td>
                  <td className="p-4">{number(row.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
