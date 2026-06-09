import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/antimule/primitives";
import { useState, useEffect } from "react";
import { BarChart2, LineChart, FlaskConical, GitCompare, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
        ) : tab === "Explainability" ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-base font-semibold mb-1">How SHAP Explainability Works</h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                SHAP (SHapley Additive exPlanations) assigns each feature a contribution value for every prediction.
                Positive values push the prediction toward <span className="text-red-400 font-medium">Mule</span>,
                negative values push toward <span className="text-green-400 font-medium">Legitimate</span>.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Global SHAP", desc: "Average |SHAP| across all predictions — shows which features matter most to the model overall.", color: "text-blue-400" },
                { label: "Local SHAP",  desc: "Per-prediction SHAP values — explains exactly why a specific account was flagged.", color: "text-purple-400" },
                { label: "Isolation Forest", desc: "Complements SHAP with anomaly scores — detects zero-day fraud patterns the trained model hasn\'t seen.", color: "text-orange-400" },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-border/60 bg-surface-2/40 p-4">
                  <div className={`text-sm font-semibold mb-2 ${item.color}`}>{item.label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            {features.length > 0 && (
              <div>
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top 10 SHAP Features</h3>
                <div className="space-y-3 max-w-2xl">
                  {features.slice(0, 10).map((f, i) => {
                    const maxImp = Math.max(...features.map(x => x.importance));
                    const pct = Math.round((f.importance / maxImp) * 100);
                    const isHigh = pct > 60;
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <span className="text-xs font-mono text-muted-foreground w-6 text-right">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-mono">{f.feature}</span>
                            <span className={isHigh ? "text-red-400 font-medium" : "text-muted-foreground"}>{(f.importance * 100).toFixed(2)}%</span>
                          </div>
                          <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${isHigh ? "bg-red-400/70" : "bg-primary/50"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="rounded-xl border border-border/40 bg-surface-2/20 p-4 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">💡 Tip:</span> To see local SHAP values for a specific account, go to{" "}
              <a href="/score" className="text-primary hover:underline">Single Account Score</a> and run the model — per-feature contributions appear in the "Why this score" panel.
            </div>
          </div>
        ) : tab === "Temporal" ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-base font-semibold mb-1">Temporal Analysis</h3>
              <p className="text-sm text-muted-foreground">Track scoring activity and mule detection rates over time.</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-surface-2/20 p-6 text-center">
              <LineChart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Score more accounts to build temporal data</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Once you score accounts via the API, a timeline of mule detection rates and risk score trends will appear here automatically.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <a href="/score"><Btn variant="secondary" size="sm">Score an account</Btn></a>
                <a href="/batch"><Btn size="sm">Batch scoring</Btn></a>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-2 grid place-items-center">
              <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-muted-foreground">
              {metrics.length === 0 ? "No models trained yet" : "Nothing to show"}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {metrics.length === 0 ? "Train a model first to see insights." : "Select a different tab."}
            </p>
            {metrics.length === 0 && <a href="/train"><Btn>Train a model</Btn></a>}
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}
