import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/cybershield/primitives";
import { FileUp, Play, Settings2 } from "lucide-react";

export const Route = createFileRoute("/train")({
  head: () => ({
    meta: [
      { title: "Train Model · CyberShield" },
      { name: "description", content: "Upload training data and train a new fraud detection model." },
    ],
  }),
  component: Train,
});

function Train() {
  return (
    <AppShell>
      <SectionHeader
        eyebrow="Workspace"
        title="Train a new model"
        subtitle="Drop in a labeled dataset, choose the algorithm, and we'll handle the heavy lifting."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Dataset uploader */}
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
            <div className="flex justify-between"><span className="text-muted-foreground">File</span><span className="font-mono text-muted-foreground">No file selected</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><span className="text-muted-foreground">—</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Label balance</span><span className="text-muted-foreground">—</span></div>
          </div>

          <div className="mt-6 flex gap-2">
            <Btn className="flex-1" disabled><Play className="h-4 w-4" />Start training</Btn>
            <Btn variant="secondary"><Settings2 className="h-4 w-4" />Configure</Btn>
          </div>
        </GlassCard>

        {/* Training progress — empty state */}
        <GlassCard className="p-6 xl:col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Step 2 · waiting</div>
          <h2 className="font-display text-lg font-semibold mt-0.5">Training run</h2>

          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">No active run</span>
              <span className="tabular-nums text-muted-foreground">0%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full gradient-primary transition-all duration-500" style={{ width: "0%" }} />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Upload a dataset to begin</div>
          </div>

          <div className="mt-5 rounded-lg bg-background/70 border border-border font-mono text-[12px] leading-relaxed p-4 max-h-56 overflow-auto">
            <div className="text-muted-foreground italic">Training logs will appear here…</div>
          </div>
        </GlassCard>

        {/* Best model — empty state */}
        <GlassCard className="p-6 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Best candidate</div>
              <h3 className="font-display text-lg font-semibold text-muted-foreground">No model trained yet</h3>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {["AUC-ROC", "PR-AUC", "Recall @ 0.5", "Precision @ 0.5"].map((k) => (
              <div key={k} className="rounded-lg bg-surface-2/60 border border-border/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="font-display text-xl font-semibold tabular-nums text-muted-foreground">—</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
