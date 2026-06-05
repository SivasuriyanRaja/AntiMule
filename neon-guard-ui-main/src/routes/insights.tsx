import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, Pill, SectionHeader } from "@/components/cybershield/primitives";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useState } from "react";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Model Insights · CyberShield" },
      { name: "description", content: "Compare models, inspect feature importance, and watch temporal performance." },
    ],
  }),
  component: Insights,
});

const models = [
  { name: "XGBoost v4.2", auc: 0.984, recall: 0.91, latency: "8ms", live: true },
  { name: "XGBoost v4.3-rc", auc: 0.987, recall: 0.92, latency: "9ms", live: false },
  { name: "LightGBM v3.1", auc: 0.981, recall: 0.89, latency: "7ms", live: false },
  { name: "Logistic Reg.", auc: 0.946, recall: 0.81, latency: "2ms", live: false },
];

const importance = [
  { f: "tx_velocity_24h", a: 0.32, b: 0.30 },
  { f: "geo_mismatch", a: 0.21, b: 0.24 },
  { f: "device_age_days", a: 0.17, b: 0.16 },
  { f: "merchant_risk", a: 0.12, b: 0.13 },
  { f: "avg_amount_zscore", a: 0.09, b: 0.10 },
  { f: "kyc_age_days", a: 0.06, b: 0.05 },
];

const temporal = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  precision: 0.92 + Math.sin(i / 2) * 0.02 + (i > 10 ? 0.01 : 0),
  recall: 0.88 + Math.cos(i / 3) * 0.025,
}));

const tabs = ["Comparison", "Importance", "Explainability", "Temporal"] as const;

function Insights() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Comparison");

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Models · v4.x"
        title="Model Insights"
        subtitle="Understand what the model thinks — and how that's changed over time."
        actions={<Btn variant="secondary">Download report</Btn>}
      />

      <div className="flex flex-wrap gap-1.5 mb-4 border-b border-border/60">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm rounded-t-lg transition-colors ${
              tab === t
                ? "text-foreground border-b-2 border-primary -mb-px bg-surface-2/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Comparison" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {models.map((m) => (
            <GlassCard key={m.name} tone={m.live ? "info" : "default"} className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">{m.name}</h3>
                {m.live && <Pill tone="info">Live</Pill>}
              </div>
              <div className="mt-4 space-y-3">
                <Stat label="AUC-ROC" value={m.auc.toFixed(3)} pct={(m.auc - 0.9) * 10} />
                <Stat label="Recall" value={m.recall.toFixed(2)} pct={(m.recall - 0.7) * 3.3} />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Latency</span>
                  <span className="font-mono">{m.latency}</span>
                </div>
              </div>
              <Btn variant="secondary" size="sm" className="w-full mt-5">View details</Btn>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === "Importance" && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Feature importance · v4.2 vs v4.3-rc</h3>
            <div className="flex gap-2 text-xs">
              <Legend2 color="var(--color-primary)" label="v4.2" />
              <Legend2 color="var(--color-gold)" label="v4.3-rc" />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={importance} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="oklch(1 0 0 / 0.06)" />
                <XAxis type="number" stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <YAxis dataKey="f" type="category" stroke="oklch(0.7 0.02 260)" fontSize={11} width={140} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="a" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                <Bar dataKey="b" fill="var(--color-gold)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {tab === "Explainability" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard className="p-6">
            <h3 className="font-display text-lg font-semibold">How the model explains itself</h3>
            <p className="text-sm text-muted-foreground mt-2">
              We use calibrated SHAP values to break each prediction into the features that pushed it
              toward "mule" or toward "legitimate". Analysts see this on every single score.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2"><span className="text-primary">›</span> Per-account waterfall plots</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Cohort drift detection (weekly)</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Counterfactual "what-if" analysis</li>
            </ul>
            <Btn className="mt-5" size="sm">Open playground</Btn>
          </GlassCard>
          <GlassCard className="p-6">
            <h3 className="font-display text-lg font-semibold">Recent counterfactual</h3>
            <p className="text-xs text-muted-foreground">ACC-441290 — what would make this account legitimate?</p>
            <div className="mt-4 space-y-2.5 text-sm">
              {[
                ["Lower tx_velocity_24h", "47 → 8", "-0.41"],
                ["Resolve geo_mismatch", "Yes → No", "-0.22"],
                ["Older device", "2 → 60 days", "-0.14"],
              ].map(([k, v, d]) => (
                <div key={k} className="flex items-center justify-between rounded-lg bg-surface-2/60 border border-border/60 px-3 py-2.5">
                  <div>
                    <div className="font-medium">{k}</div>
                    <div className="text-xs text-muted-foreground font-mono">{v}</div>
                  </div>
                  <span className="text-success font-mono text-sm">{d}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {tab === "Temporal" && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Performance over time</h3>
            <div className="flex gap-2 text-xs">
              <Legend2 color="var(--color-primary)" label="Precision" />
              <Legend2 color="var(--color-success)" label="Recall" />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temporal} margin={{ left: -10, right: 16 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" />
                <XAxis dataKey="day" stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} domain={[0.8, 1]} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="precision" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="recall" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}
    </AppShell>
  );
}

function Stat({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full gradient-primary" style={{ width: `${Math.min(100, Math.max(8, pct * 100))}%` }} />
      </div>
    </div>
  );
}

function Legend2({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
    </span>
  );
}
