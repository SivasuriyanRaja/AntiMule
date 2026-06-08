import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/cybershield/primitives";
import { useState, useEffect } from "react";
import { BarChart2, LineChart, FlaskConical, GitCompare, CheckCircle2 } from "lucide-react";

const API_BASE = "http://localhost:8005";

interface FeatureImportance {
  feature: string;
  importance: number;
}

interface ModelMetrics {
  model: string;
  avg_precision: number;
  precision: number;
  recall: number;
  roc_auc: number;
}

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

  const [features, setFeatures] = useState<FeatureImportance[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [bestModel, setBestModel] = useState<ModelMetrics | null>(null);

  useEffect(() => {
    // Fetch feature importances
    fetch(`${API_BASE}/model/feature-importance`)
      .then((r) => r.json())
      .then((data) => {
        if (data.available && data.features) {
          setFeatures(data.features);
        }
      })
      .catch((err) => console.error("Failed to fetch features", err));

    // Fetch model metrics
    fetch(`${API_BASE}/model/metrics`)
      .then((r) => r.json())
      .then((data) => {
        if (data.available && data.metrics) {
          setMetrics(data.metrics);
          const best = data.metrics.reduce((prev: ModelMetrics, current: ModelMetrics) => 
            (prev.avg_precision > current.avg_precision) ? prev : current
          );
          setBestModel(best);
        }
      })
      .catch((err) => console.error("Failed to fetch metrics", err));
  }, []);

  return (
    <AppShell>
      <SectionHeader
        eyebrow={bestModel ? `Models · ${bestModel.model} active` : "Models · none loaded"}
        title="Model Insights"
        subtitle="Compare performance and review feature importance for the latest training run."
        actions={<Btn variant="secondary" disabled={!bestModel}>Download report</Btn>}
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
        {metrics.length > 0 && tab === "Comparison" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="pb-3 font-medium">Model</th>
                  <th className="pb-3 font-medium">Avg Precision</th>
                  <th className="pb-3 font-medium">ROC-AUC</th>
                  <th className="pb-3 font-medium">Recall</th>
                  <th className="pb-3 font-medium">Precision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {metrics.map((m) => (
                  <tr key={m.model} className="hover:bg-surface-2/20 transition-colors">
                    <td className="py-3 font-medium flex items-center gap-2">
                      {m.model}
                      {bestModel?.model === m.model && <CheckCircle2 className="h-4 w-4 text-success" />}
                    </td>
                    <td className="py-3">{m.avg_precision.toFixed(4)}</td>
                    <td className="py-3">{m.roc_auc.toFixed(4)}</td>
                    <td className="py-3">{m.recall.toFixed(4)}</td>
                    <td className="py-3">{m.precision.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : features.length > 0 && tab === "Importance" ? (
          <div className="space-y-4 max-w-3xl">
            <h3 className="font-semibold text-lg">Top Feature Drivers</h3>
            <div className="space-y-3">
              {features.map((f, i) => {
                const maxImp = Math.max(...features.map((x) => x.importance));
                const pct = Math.round((f.importance / maxImp) * 100);
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-mono text-foreground/80">{f.feature}</span>
                      <span className="text-muted-foreground">{f.importance.toFixed(4)}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-2 grid place-items-center">
              <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold text-muted-foreground">
                {metrics.length === 0 ? "No models to compare yet" : "Feature coming soon"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {metrics.length === 0 ? (
                  "Train at least one model to see performance metrics here."
                ) : (
                  "This tab is under construction. Check Comparison or Importance."
                )}
              </p>
            </div>
            {metrics.length === 0 && (
              <a href="/train">
                <Btn>Train a model</Btn>
              </a>
            )}
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}
