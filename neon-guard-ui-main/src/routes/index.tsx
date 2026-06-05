import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import {
  Btn,
  GlassCard,
  MetricTile,
  Pill,
  SectionHeader,
} from "@/components/cybershield/primitives";
import { Sparkline } from "@/components/cybershield/Sparkline";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Brain, ShieldAlert, Sparkles, UserSearch } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · CyberShield" },
      { name: "description", content: "Real-time fraud detection overview, alerts, and global model explanations." },
    ],
  }),
  component: Overview,
});

const shapData = [
  { f: "txn_velocity_24h", v: 0.32 },
  { f: "geo_mismatch", v: 0.21 },
  { f: "device_age_days", v: 0.17 },
  { f: "merchant_risk_score", v: 0.12 },
  { f: "avg_amount_zscore", v: 0.09 },
  { f: "kyc_age_days", v: 0.06 },
  { f: "ip_asn_reputation", v: 0.03 },
];

const alerts = [
  { id: "A-90213", account: "•••• 4421", tier: "high" as const, reason: "Mule pattern · 7 hops in 12 min", time: "2m ago" },
  { id: "A-90211", account: "•••• 1190", tier: "med" as const, reason: "Geo mismatch · device new", time: "6m ago" },
  { id: "A-90208", account: "•••• 7732", tier: "high" as const, reason: "Velocity spike · 24× baseline", time: "11m ago" },
  { id: "A-90205", account: "•••• 0042", tier: "low" as const, reason: "Unusual MCC · review only", time: "18m ago" },
  { id: "A-90201", account: "•••• 8810", tier: "med" as const, reason: "ASN reputation low", time: "27m ago" },
];

function Overview() {
  return (
    <AppShell>
      <SectionHeader
        eyebrow="Today · Live"
        title="Operations Overview"
        subtitle="Calm waters. A few signals worth a closer look — nothing critical in the last hour."
        actions={
          <>
            <Link to="/train"><Btn variant="secondary"><Brain className="h-4 w-4" />Start training</Btn></Link>
            <Link to="/score"><Btn><UserSearch className="h-4 w-4" />Score account</Btn></Link>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricTile
          label="Transactions scored"
          value="248,910"
          delta="+12.4%"
          tone="info"
          spark={<Sparkline data={[12, 18, 14, 22, 19, 26, 31, 28, 34, 36]} />}
        />
        <MetricTile
          label="Suspicious flagged"
          value="1,284"
          delta="+3.1%"
          tone="warning"
          spark={<Sparkline data={[8, 6, 9, 7, 11, 10, 13, 12, 14, 15]} color="var(--color-gold)" />}
        />
        <MetricTile
          label="Confirmed mule"
          value="92"
          delta="-1.2%"
          tone="critical"
          spark={<Sparkline data={[4, 6, 5, 7, 4, 5, 3, 4, 3, 2]} color="var(--color-coral)" />}
        />
        <MetricTile
          label="Model precision"
          value="0.946"
          delta="+0.4%"
          tone="success"
          spark={<Sparkline data={[0.9, 0.91, 0.92, 0.93, 0.93, 0.94, 0.94, 0.95, 0.94, 0.95]} color="var(--color-success)" />}
        />
      </div>

      {/* Body grid */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent alerts */}
        <GlassCard className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Recent alerts</h2>
              <p className="text-xs text-muted-foreground">Newest first · auto-refreshing every 15s</p>
            </div>
            <Btn variant="ghost" size="sm">View all <ArrowUpRight className="h-3.5 w-3.5" /></Btn>
          </div>
          <ul className="divide-y divide-border/60">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center gap-4 py-3">
                <div className={`h-9 w-9 rounded-lg grid place-items-center ${
                  a.tier === "high" ? "bg-coral/15 text-coral" :
                  a.tier === "med" ? "bg-gold/15 text-gold" : "bg-success/15 text-success"
                }`}>
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{a.id}</span>
                    <span className="text-sm font-medium">{a.account}</span>
                    <Pill tone={a.tier === "high" ? "high" : a.tier === "med" ? "med" : "low"}>
                      {a.tier === "high" ? "SUSPICIOUS (MULE)" : a.tier === "med" ? "REVIEW" : "LEGITIMATE"}
                    </Pill>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.reason}</div>
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">{a.time}</div>
                <Btn variant="secondary" size="sm">Open</Btn>
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* Global SHAP */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-display text-lg font-semibold">Global feature importance</h2>
              <p className="text-xs text-muted-foreground">Mean |SHAP| · last 30 days</p>
            </div>
            <Pill tone="info"><Sparkles className="h-3 w-3" /> XGBoost v4.2</Pill>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid horizontal={false} stroke="oklch(1 0 0 / 0.06)" />
                <XAxis type="number" stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <YAxis dataKey="f" type="category" stroke="oklch(0.7 0.02 260)" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.22 0.02 260)",
                    border: "1px solid oklch(1 0 0 / 0.08)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="v" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
