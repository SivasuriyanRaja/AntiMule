import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/cybershield/primitives";
import { useState } from "react";
import { BarChart2, LineChart, FlaskConical, GitCompare } from "lucide-react";

export const Route = createFileRoute("/insights")({
  component: Insights,
});

const tabs = ["Comparison", "Importance", "Explainability", "Temporal"] as const;

const tabIcons = {
  Comparison: GitCompare,
  Importance: BarChart2,
  Explainability: FlaskConical,
  Temporal: LineChart,
};

function Insights() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Comparison");
  const Icon = tabIcons[tab];

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Models · none loaded"
        title="Model Insights"
        subtitle="Train and promote a model to start comparing performance and explanations."
        actions={<Btn variant="secondary" disabled>Download report</Btn>}
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

      {/* All tabs show empty state until models are trained */}
      <GlassCard className="p-6">
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-surface-2 grid place-items-center">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-semibold text-muted-foreground">No models to compare yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {tab === "Comparison" && "Train at least one model to see performance metrics like AUC-ROC, Recall, and Latency here."}
              {tab === "Importance" && "Feature importance (SHAP) will appear here once a model has been trained."}
              {tab === "Explainability" && "SHAP waterfall plots and counterfactual analysis will appear here after model training."}
              {tab === "Temporal" && "Precision and Recall over time will be tracked here once a model is in production."}
            </p>
          </div>
          <a href="/train">
            <Btn>Train a model</Btn>
          </a>
        </div>
      </GlassCard>
    </AppShell>
  );
}
