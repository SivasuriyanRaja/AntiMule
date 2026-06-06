import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/cybershield/primitives";
import { ScanSearch, Workflow } from "lucide-react";

export const Route = createFileRoute("/score")({
  component: Score,
});

const defaultFeatures = [
  { k: "Account age (days)", placeholder: "e.g. 365" },
  { k: "Avg tx amount (90d)", placeholder: "e.g. 200.00" },
  { k: "Tx velocity 24h", placeholder: "e.g. 10" },
  { k: "Geo mismatch", placeholder: "Yes / No" },
  { k: "Device age (days)", placeholder: "e.g. 90" },
  { k: "Merchant risk", placeholder: "0.00 – 1.00" },
  { k: "KYC age (days)", placeholder: "e.g. 180" },
  { k: "ASN reputation", placeholder: "High / Low" },
];

function Score() {
  return (
    <AppShell>
      <SectionHeader
        eyebrow="Account · —"
        title="Single Account Score"
        subtitle="Fill in the account features on the left, then run the model to see the risk score."
        actions={
          <>
            <Btn variant="secondary" disabled>Save case</Btn>
            <Btn disabled><ScanSearch className="h-4 w-4" />Run score</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Features form */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Account features</h2>
          <p className="text-xs text-muted-foreground mb-4">Enter values to compute the risk score</p>
          <div className="space-y-3">
            {defaultFeatures.map((f) => (
              <div key={f.k} className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground w-40 shrink-0">{f.k}</label>
                <input
                  placeholder={f.placeholder}
                  className="flex-1 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
                />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Risk dial — empty */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Risk probability</h2>
          <div className="mt-4 flex flex-col items-center justify-center py-8 gap-3 text-center">
            <RiskDialEmpty />
            <p className="text-sm text-muted-foreground">Score not computed yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Fill in the account features and click "Run score" to see the result.
            </p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-lg border border-border/60 text-muted-foreground px-2 py-1.5">
              <div className="font-medium">Legit</div><div className="opacity-80">0–39</div>
            </div>
            <div className="rounded-lg border border-border/60 text-muted-foreground px-2 py-1.5">
              <div className="font-medium">Review</div><div className="opacity-80">40–69</div>
            </div>
            <div className="rounded-lg border border-border/60 text-muted-foreground px-2 py-1.5">
              <div className="font-medium">Mule</div><div className="opacity-80">70–100</div>
            </div>
          </div>
        </GlassCard>

        {/* SHAP + rules — empty */}
        <div className="xl:col-span-4 space-y-4">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">Why this score</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border/60 rounded-full px-2.5 py-1">
                <Workflow className="h-3 w-3" /> SHAP
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <p className="text-sm text-muted-foreground">No score to explain yet</p>
              <p className="text-xs text-muted-foreground">SHAP waterfall will appear after scoring</p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="font-display text-lg font-semibold mb-3">Rule-based alerts</h2>
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <p className="text-sm text-muted-foreground">No alerts triggered</p>
              <p className="text-xs text-muted-foreground">Rules will be evaluated after scoring</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}

function RiskDialEmpty() {
  const r = 78;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-56 w-56">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="14" fill="none" />
        <circle
          cx="100" cy="100" r={r}
          stroke="oklch(0.6 0.02 260)" strokeWidth="14" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-5xl font-semibold tabular-nums text-muted-foreground">—</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">of 100</div>
        </div>
      </div>
    </div>
  );
}
