import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, Pill, SectionHeader } from "@/components/cybershield/primitives";
import { Download, FileUp, Filter } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "Batch Scoring · CyberShield" },
      { name: "description", content: "Score thousands of accounts at once and triage the riskiest." },
    ],
  }),
  component: Batch,
});

const distribution = [
  { name: "Legit", value: 8420, color: "var(--color-success)" },
  { name: "Review", value: 612, color: "var(--color-gold)" },
  { name: "Mule", value: 148, color: "var(--color-coral)" },
];

const histogram = Array.from({ length: 10 }, (_, i) => ({
  bucket: `${i * 10}-${i * 10 + 10}`,
  count: Math.round(2000 * Math.exp(-((i - 1) ** 2) / 4) + 80 + (i > 7 ? 300 : 0)),
}));

const rows = [
  { id: "ACC-441290", risk: 0.94, tier: "high", country: "BR", reasons: "velocity, geo" },
  { id: "ACC-441288", risk: 0.88, tier: "high", country: "NG", reasons: "device, ASN" },
  { id: "ACC-441280", risk: 0.71, tier: "high", country: "RO", reasons: "merchant" },
  { id: "ACC-441272", risk: 0.62, tier: "med", country: "US", reasons: "MCC change" },
  { id: "ACC-441264", risk: 0.48, tier: "med", country: "DE", reasons: "kyc young" },
  { id: "ACC-441250", risk: 0.21, tier: "low", country: "FR", reasons: "—" },
] as const;

function Batch() {
  return (
    <AppShell>
      <SectionHeader
        eyebrow="Batch · run #2841"
        title="Batch Scoring"
        subtitle="9,180 accounts scored in 18 seconds. 760 need a human eye."
        actions={
          <>
            <Btn variant="secondary"><Filter className="h-4 w-4" /> Filters</Btn>
            <Btn><Download className="h-4 w-4" /> Export CSV</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Uploader */}
        <GlassCard tone="info" className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Upload batch</h2>
          <label className="mt-4 block rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer p-6 text-center">
            <FileUp className="h-7 w-7 mx-auto text-primary" />
            <div className="mt-2 text-sm font-medium">accounts_batch.csv</div>
            <div className="text-xs text-muted-foreground mt-0.5">9,180 rows · 14 columns</div>
            <input type="file" className="sr-only" aria-label="Upload batch file" />
          </label>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {distribution.map((d) => (
              <div key={d.name} className="rounded-lg bg-surface-2/60 border border-border/60 p-2.5">
                <div className="text-[10px] uppercase text-muted-foreground">{d.name}</div>
                <div className="font-display text-lg font-semibold tabular-nums" style={{ color: d.color }}>{d.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Pie */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Tier distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" innerRadius={50} outerRadius={82} paddingAngle={2}>
                  {distribution.map((d) => <Cell key={d.name} fill={d.color} stroke="oklch(0.18 0.018 260)" strokeWidth={3} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Histogram */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Risk histogram</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="bucket" stroke="oklch(0.7 0.02 260)" fontSize={10} />
                <YAxis stroke="oklch(0.7 0.02 260)" fontSize={10} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Heatmap */}
        <GlassCard className="p-6 xl:col-span-5">
          <h2 className="font-display text-lg font-semibold">Top-suspicious heatmap</h2>
          <p className="text-xs text-muted-foreground mb-4">Country × hour of day · darker = more flags</p>
          <Heatmap />
        </GlassCard>

        {/* Results table */}
        <GlassCard className="p-0 xl:col-span-7 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <h2 className="font-display text-lg font-semibold">Results · highest risk first</h2>
            <Pill tone="info">760 to review</Pill>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Account</th>
                  <th className="text-left font-medium px-3 py-3">Risk</th>
                  <th className="text-left font-medium px-3 py-3">Tier</th>
                  <th className="text-left font-medium px-3 py-3">Country</th>
                  <th className="text-left font-medium px-3 py-3">Drivers</th>
                  <th className="text-right font-medium px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-2/30">
                    <td className="px-5 py-3 font-mono text-xs">{r.id}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${r.risk * 100}%`,
                              background: r.tier === "high" ? "var(--color-coral)" : r.tier === "med" ? "var(--color-gold)" : "var(--color-success)",
                            }}
                          />
                        </div>
                        <span className="tabular-nums text-xs">{r.risk.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><Pill tone={r.tier as "low" | "med" | "high"}>{r.tier.toUpperCase()}</Pill></td>
                    <td className="px-3 py-3 text-muted-foreground">{r.country}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{r.reasons}</td>
                    <td className="px-5 py-3 text-right">
                      <Btn variant="ghost" size="sm">Review</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}

function Heatmap() {
  const countries = ["US", "BR", "NG", "RO", "DE", "FR", "IN"];
  const hours = Array.from({ length: 12 }, (_, i) => i * 2);
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(${hours.length}, 1fr)` }}>
          <div />
          {hours.map((h) => (
            <div key={h} className="text-[10px] text-muted-foreground text-center pb-1.5">{h}h</div>
          ))}
          {countries.map((c) => (
            <Row key={c} country={c} hours={hours} />
          ))}
        </div>
      </div>
    </div>
  );
}
function Row({ country, hours }: { country: string; hours: number[] }) {
  return (
    <>
      <div className="text-xs text-muted-foreground pr-2 flex items-center">{country}</div>
      {hours.map((h) => {
        const v = Math.random() * 0.9 + 0.05;
        return (
          <div
            key={h}
            className="aspect-square m-0.5 rounded-md transition-transform hover:scale-110"
            style={{
              background: `oklch(0.66 ${0.05 + v * 0.18} 28 / ${0.15 + v * 0.85})`,
              boxShadow: v > 0.7 ? "0 0 12px oklch(0.66 0.21 28 / 0.4)" : "none",
            }}
            title={`${country} · ${h}h · ${(v * 100).toFixed(0)} flags`}
          />
        );
      })}
    </>
  );
}
