import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, Pill, SectionHeader } from "@/components/cybershield/primitives";
import { CheckCircle2, FileUp, Play, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/train")({
  head: () => ({
    meta: [
      { title: "Train Model · CyberShield" },
      { name: "description", content: "Upload training data and train a new fraud detection model." },
    ],
  }),
  component: Train,
});

const logLines = [
  "[12:04:01] Loading dataset transactions_2026q2.parquet (3.4 GB)…",
  "[12:04:09] Feature engineering · 184 features generated",
  "[12:04:22] Train/val split 80/20 · stratified by label",
  "[12:04:31] Fitting XGBoost · early stopping = 50 rounds",
  "[12:05:12] AUC 0.9871 · PR 0.942 · recall@0.5 = 0.91",
  "[12:05:14] Calibrating probabilities (isotonic)…",
  "[12:05:21] Saved artifact models/xgb-v4.3.bin",
];

function Train() {
  const [progress, setProgress] = useState(72);

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Workspace"
        title="Train a new model"
        subtitle="Drop in a labeled dataset, choose the algorithm, and we'll handle the heavy lifting."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Uploader */}
        <GlassCard tone="info" className="p-6 xl:col-span-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Step 1</div>
          <h2 className="font-display text-lg font-semibold">Dataset</h2>
          <label className="mt-4 block rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer p-8 text-center">
            <FileUp className="h-8 w-8 mx-auto text-primary" />
            <div className="mt-3 text-sm font-medium">Drop CSV or Parquet</div>
            <div className="text-xs text-muted-foreground mt-1">or click to browse · up to 5 GB</div>
            <input type="file" className="sr-only" aria-label="Upload training dataset" />
          </label>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">File</span><span className="font-mono">transactions_2026q2.parquet</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><span className="tabular-nums">12,480,991</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Label balance</span><span>97.8% / 2.2%</span></div>
          </div>

          <div className="mt-6 flex gap-2">
            <Btn className="flex-1"><Play className="h-4 w-4" />Start training</Btn>
            <Btn variant="secondary">Configure</Btn>
          </div>
        </GlassCard>

        {/* Progress */}
        <GlassCard className="p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Step 2 · in progress</div>
              <h2 className="font-display text-lg font-semibold">Training run #1284</h2>
            </div>
            <Pill tone="info">XGBoost · v4.3-rc</Pill>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Round 412 / 600</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full gradient-primary shadow-glow transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">ETA ~ 2m 14s</div>
          </div>

          <div className="mt-5 rounded-lg bg-background/70 border border-border font-mono text-[12px] leading-relaxed p-4 max-h-56 overflow-auto">
            {logLines.map((l, i) => (
              <div key={i} className="text-muted-foreground">
                <span className="text-primary">›</span> {l}
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Btn variant="secondary" size="sm" onClick={() => setProgress((p) => Math.min(100, p + 7))}>Simulate progress</Btn>
            <Btn variant="ghost" size="sm">Pause</Btn>
          </div>
        </GlassCard>

        {/* Best model */}
        <GlassCard tone="success" className="p-6 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-success/15 text-success grid place-items-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-success">Best candidate</div>
                <h3 className="font-display text-lg font-semibold">xgb-v4.3-rc · ready to promote</h3>
              </div>
              <Pill tone="info"><Sparkles className="h-3 w-3" /> +1.4% recall</Pill>
            </div>
            <div className="flex gap-2">
              <Btn variant="secondary">Compare to v4.2</Btn>
              <Btn>Promote to production</Btn>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["AUC-ROC", "0.9871"],
              ["PR-AUC", "0.942"],
              ["Recall @ 0.5", "0.91"],
              ["Precision @ 0.5", "0.95"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-surface-2/60 border border-border/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="font-display text-xl font-semibold tabular-nums">{v}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
