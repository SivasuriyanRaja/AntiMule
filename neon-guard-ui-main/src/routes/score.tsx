import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, Pill, SectionHeader } from "@/components/cybershield/primitives";
import { AlertTriangle, ShieldCheck, Workflow } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/score")({
  head: () => ({
    meta: [
      { title: "Single Account Score · CyberShield" },
      { name: "description", content: "Score an individual account and inspect SHAP-based explanations and rules." },
    ],
  }),
  component: Score,
});

const features = [
  { k: "Account age (days)", v: "412", w: 0.04 },
  { k: "Avg tx amount (90d)", v: "$182.40", w: 0.07 },
  { k: "Tx velocity 24h", v: "47", w: 0.32 },
  { k: "Geo mismatch", v: "Yes", w: 0.21 },
  { k: "Device age (days)", v: "2", w: 0.17 },
  { k: "Merchant risk", v: "0.78", w: 0.12 },
  { k: "KYC age (days)", v: "30", w: 0.05 },
  { k: "ASN reputation", v: "Low", w: 0.03 },
];

const shap = [
  { f: "tx_velocity_24h", v: +0.34 },
  { f: "geo_mismatch", v: +0.22 },
  { f: "device_age_days", v: +0.18 },
  { f: "merchant_risk", v: +0.11 },
  { f: "kyc_age_days", v: -0.05 },
  { f: "account_age_days", v: -0.08 },
];

const rules = [
  { id: "R-12", tone: "high" as const, text: "Velocity > 20× baseline within 60 min" },
  { id: "R-04", tone: "med" as const, text: "New device + geo mismatch" },
  { id: "R-21", tone: "low" as const, text: "Merchant category change" },
];

function Score() {
  const risk = 87; // 0-100
  const tier = risk >= 70 ? "high" : risk >= 40 ? "med" : "low";
  const tierLabel = tier === "high" ? "SUSPICIOUS (MULE)" : tier === "med" ? "REVIEW" : "LEGITIMATE";

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Account · •••• 4421"
        title="Single Account Score"
        subtitle="Edit the features on the left to see the risk recalculate. Explanations stay in sync."
        actions={
          <>
            <Btn variant="secondary">Save case</Btn>
            <Btn variant="danger"><AlertTriangle className="h-4 w-4" /> Freeze account</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Features */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Account features</h2>
          <p className="text-xs text-muted-foreground mb-4">Editable · changes recompute the score</p>
          <div className="space-y-3">
            {features.map((f) => (
              <FeatureRow key={f.k} {...f} />
            ))}
          </div>
        </GlassCard>

        {/* Risk dial */}
        <GlassCard tone={tier === "high" ? "critical" : tier === "med" ? "warning" : "success"} className="p-6 xl:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Risk probability</h2>
            <Pill tone={tier as "low" | "med" | "high"}>{tierLabel}</Pill>
          </div>
          <div className="mt-4 flex flex-col items-center justify-center">
            <RiskDial value={risk} />
            <div className="mt-4 text-center">
              <div className="text-xs text-muted-foreground">Model confidence</div>
              <div className="text-sm font-medium">Calibrated · ±2.1%</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]">
            <Tier label="Legit" range="0–39" active={tier === "low"} tone="low" />
            <Tier label="Review" range="40–69" active={tier === "med"} tone="med" />
            <Tier label="Mule" range="70–100" active={tier === "high"} tone="high" />
          </div>
        </GlassCard>

        {/* SHAP + rules */}
        <div className="xl:col-span-4 space-y-4">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">Why this score</h2>
              <Pill tone="info"><Workflow className="h-3 w-3" /> SHAP</Pill>
            </div>
            <ShapWaterfall data={shap} />
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="font-display text-lg font-semibold mb-3">Rule-based alerts</h2>
            <ul className="space-y-2">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface-2/50 px-3 py-2.5">
                  <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
                  <span className="text-sm flex-1">{r.text}</span>
                  <Pill tone={r.tone}>{r.tone === "high" ? "Critical" : r.tone === "med" ? "Warn" : "Info"}</Pill>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Btn variant="secondary" size="sm"><ShieldCheck className="h-3.5 w-3.5" /> Approve</Btn>
              <Btn variant="danger" size="sm">Escalate</Btn>
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}

function FeatureRow({ k, v, w }: { k: string; v: string; w: number }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-muted-foreground w-40 shrink-0">{k}</label>
      <input
        defaultValue={v}
        className="flex-1 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <span className="text-[10px] tabular-nums text-muted-foreground w-12 text-right">w {w.toFixed(2)}</span>
    </div>
  );
}

function RiskDial({ value }: { value: number }) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 70 ? "var(--color-coral)" : value >= 40 ? "var(--color-gold)" : "var(--color-success)";
  return (
    <div className="relative h-56 w-56">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="14" fill="none" />
        <circle
          cx="100" cy="100" r={r}
          stroke={color} strokeWidth="14" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.2,.7,.2,1)", filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-5xl font-semibold tabular-nums">{value}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">of 100</div>
        </div>
      </div>
    </div>
  );
}

function Tier({ label, range, active, tone }: { label: string; range: string; active: boolean; tone: "low" | "med" | "high" }) {
  const colors = { low: "border-success/40 text-success", med: "border-gold/40 text-gold", high: "border-coral/40 text-coral" };
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${active ? `${colors[tone]} bg-surface-2` : "border-border/60 text-muted-foreground"}`}>
      <div className="font-medium">{label}</div>
      <div className="opacity-80">{range}</div>
    </div>
  );
}

function ShapWaterfall({ data }: { data: { f: string; v: number }[] }) {
  const max = Math.max(...data.map((d) => Math.abs(d.v)));
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const pct = (Math.abs(d.v) / max) * 50;
        const positive = d.v > 0;
        return (
          <div key={d.f} className="text-xs">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-muted-foreground">{d.f}</span>
              <span className={`tabular-nums ${positive ? "text-coral" : "text-success"}`}>
                {positive ? "+" : ""}{d.v.toFixed(2)}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-surface-2">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
              <div
                className="absolute top-0 h-full rounded-full"
                style={{
                  left: positive ? "50%" : `${50 - pct}%`,
                  width: `${pct}%`,
                  background: positive ? "var(--color-coral)" : "var(--color-success)",
                  boxShadow: `0 0 12px ${positive ? "var(--color-coral)" : "var(--color-success)"}`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
