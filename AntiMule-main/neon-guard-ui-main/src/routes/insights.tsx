import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/antimule/primitives";
import { useState, useEffect } from "react";
import {
  BarChart2,
  LineChart,
  FlaskConical,
  GitCompare,
  CheckCircle2,
  Download,
  TrendingUp,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

const API_BASE = API_BASE_URL;

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

const tabs = ["Comparison", "Importance", "Performance", "Explainability"] as const;

const tabIcons = {
  Comparison: GitCompare,
  Importance: BarChart2,
  Performance: TrendingUp,
  Explainability: FlaskConical,
};

function Insights() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Comparison");
  const Icon = tabIcons[tab];

  const [features, setFeatures] = useState<FeatureImportance[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [bestModel, setBestModel] = useState<ModelMetrics | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/model/feature-importance`)
      .then((r) => r.json())
      .then((data) => { if (data.available && data.features) setFeatures(data.features); })
      .catch(() => {});

    fetch(`${API_BASE}/model/metrics`)
      .then((r) => r.json())
      .then((data) => {
        if (data.available && data.metrics) {
          setMetrics(data.metrics);
          const best = data.metrics.reduce((prev: ModelMetrics, cur: ModelMetrics) =>
            prev.avg_precision > cur.avg_precision ? prev : cur
          );
          setBestModel(best);
        }
      })
      .catch(() => {});
  }, []);

  // Prepare radar data for best model
  const radarData = bestModel
    ? [
        { metric: "Precision", value: Math.round(bestModel.precision * 100) },
        { metric: "Recall", value: Math.round(bestModel.recall * 100) },
        { metric: "ROC-AUC", value: Math.round(bestModel.roc_auc * 100) },
        { metric: "Avg Precision", value: Math.round(bestModel.avg_precision * 100) },
      ]
    : [];

  return (
    <AppShell>
      <SectionHeader
        eyebrow={bestModel ? `ML System · ${bestModel.model} active` : "ML System · no model loaded"}
        title="Detection Model Insights"
        subtitle="Review model performance, feature importance, and explainability for your currently deployed AML detection model."
        actions={
          <Btn variant="secondary" disabled={!bestModel}>
            <Download className="h-4 w-4" />
            Download Report
          </Btn>
        }
      />

      {/* Model summary KPIs */}
      {bestModel && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Avg Precision", value: (bestModel.avg_precision * 100).toFixed(1) + "%" },
            { label: "ROC-AUC", value: bestModel.roc_auc.toFixed(4) },
            { label: "Precision", value: (bestModel.precision * 100).toFixed(1) + "%" },
            { label: "Recall", value: (bestModel.recall * 100).toFixed(1) + "%" },
          ].map(({ label, value }) => (
            <GlassCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="font-display text-2xl font-semibold mt-0.5 tabular-nums">{value}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-border/50">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-t-lg transition-colors ${
              tab === t
                ? "text-foreground border-b-2 border-primary -mb-px bg-surface-2/30 font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {(() => { const TabIcon = tabIcons[t]; return <TabIcon className="h-3.5 w-3.5" />; })()}
            {t}
          </button>
        ))}
      </div>

      <GlassCard className="p-6">
        {/* Model Comparison Table */}
        {tab === "Comparison" && metrics.length > 0 ? (
          <div className="overflow-x-auto">
            <h3 className="font-display text-base font-semibold mb-4">Model Performance Comparison</h3>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="pb-3 font-medium">Model</th>
                  <th className="pb-3 font-medium">Avg Precision</th>
                  <th className="pb-3 font-medium">ROC-AUC</th>
                  <th className="pb-3 font-medium">Recall</th>
                  <th className="pb-3 font-medium">Precision</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {metrics.map((m) => (
                  <tr key={m.model} className="hover:bg-surface-2/20 transition-colors">
                    <td className="py-3 font-medium flex items-center gap-2">
                      {m.model}
                    </td>
                    <td className="py-3 tabular-nums">{(m.avg_precision * 100).toFixed(2)}%</td>
                    <td className="py-3 tabular-nums">{m.roc_auc.toFixed(4)}</td>
                    <td className="py-3 tabular-nums">{(m.recall * 100).toFixed(2)}%</td>
                    <td className="py-3 tabular-nums">{(m.precision * 100).toFixed(2)}%</td>
                    <td className="py-3">
                      {bestModel?.model === m.model ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/15 border border-success/30 rounded-full px-2.5 py-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "Importance" && features.length > 0 ? (
          <div className="space-y-5">
            <h3 className="font-display text-base font-semibold">Top Feature Drivers</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={features.slice(0, 10).map((f) => ({ name: f.feature, value: f.importance }))}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.025 245 / 0.40)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "oklch(0.60 0.015 245)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.60 0.015 245)", fontFamily: "JetBrains Mono, monospace" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.16 0.028 245)", border: "1px solid oklch(0.28 0.025 245 / 0.70)", borderRadius: 10, fontSize: 12, color: "oklch(0.95 0.008 55)" }}
                    itemStyle={{ color: "oklch(0.95 0.008 55)" }}
                    labelStyle={{ color: "oklch(0.95 0.008 55)" }}
                    formatter={(v: any) => [v.toFixed(4), "Importance"]}
                  />
                  <Bar dataKey="value" name="Importance" fill="oklch(0.76 0.13 72 / 0.80)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 max-w-2xl">
              {features.slice(0, 8).map((f, i) => {
                const maxImp = Math.max(...features.map((x) => x.importance));
                const pct = Math.round((f.importance / maxImp) * 100);
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-foreground/80">{f.feature}</span>
                      <span className="text-muted-foreground">{f.importance.toFixed(4)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : tab === "Performance" && bestModel ? (
          <div className="space-y-5">
            <h3 className="font-display text-base font-semibold">Model Performance Radar</h3>
            <div className="h-[300px] max-w-md mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="oklch(0.28 0.025 245 / 0.50)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "oklch(0.60 0.015 245)" }} />
                  <Radar
                    name={bestModel.model}
                    dataKey="value"
                    stroke="oklch(0.76 0.13 72)"
                    fill="oklch(0.76 0.13 72 / 0.20)"
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.16 0.028 245)", border: "1px solid oklch(0.28 0.025 245 / 0.70)", borderRadius: 10, fontSize: 12, color: "oklch(0.95 0.008 55)" }}
                    itemStyle={{ color: "oklch(0.95 0.008 55)" }}
                    labelStyle={{ color: "oklch(0.95 0.008 55)" }}
                    formatter={(v: any) => [`${v}%`, "Score"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-2 grid place-items-center">
              <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold text-muted-foreground">
                {metrics.length === 0 ? "No detection models trained yet" : "Feature coming soon"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {metrics.length === 0
                  ? "Train at least one model to see performance metrics and feature importance."
                  : "This view is under construction. Check Comparison or Importance tabs."}
              </p>
            </div>
            {metrics.length === 0 && (
              <a href="/train">
                <Btn variant="gold">Retrain Detection Model</Btn>
              </a>
            )}
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
}
