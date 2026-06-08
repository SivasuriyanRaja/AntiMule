import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import {
  Btn,
  GlassCard,
  MetricTile,
  SectionHeader,
} from "@/components/antimule/primitives";
import { Brain, UserSearch, BarChart2, ShieldOff, Activity } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Overview,
});

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

function Overview() {
  const [features, setFeatures] = useState<FeatureImportance[]>([]);
  const [bestModel, setBestModel] = useState<ModelMetrics | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    // Fetch DB Stats
    fetch(`${API_BASE}/db/stats`, { headers })
      .then(r => r.json())
      .then(data => { if (data.total_scored !== undefined) setStats(data); })
      .catch(() => {});

    // Fetch Alerts
    fetch(`${API_BASE}/db/alerts?limit=5`, { headers })
      .then(r => r.json())
      .then(data => { if (data.alerts) setAlerts(data.alerts); })
      .catch(() => {});

    // Fetch Recent Activity
    fetch(`${API_BASE}/db/recent?limit=5`, { headers })
      .then(r => r.json())
      .then(data => { if (data.results) setRecent(data.results); })
      .catch(() => {});
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
          // Find the model with the highest avg_precision
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
        eyebrow="Dashboard · Live"
        title="Operations Overview"
        subtitle="No data yet. Train a model or score an account to get started."
        actions={
          <>
            <Link to="/train"><Btn variant="secondary"><Brain className="h-4 w-4" />Train model</Btn></Link>
            <Link to="/score"><Btn><UserSearch className="h-4 w-4" />Score account</Btn></Link>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricTile label="Transactions scored" value={stats?.total_scored ?? "—"} tone="info" />
        <MetricTile label="Suspicious flagged" value={stats?.open_alerts ?? "—"} tone="warning" />
        <MetricTile label="Confirmed mule" value={stats?.mule_count ?? "—"} tone="critical" />
        <MetricTile label="Model precision" value={bestModel ? `${(bestModel.precision * 100).toFixed(1)}%` : "—"} tone="success" />
      </div>

      {/* Body grid */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent alerts */}
        <GlassCard className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Recent alerts</h2>
              <p className="text-xs text-muted-foreground">High-risk accounts requiring review</p>
            </div>
          </div>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-2/40 border border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-coral/10 text-coral flex items-center justify-center">
                      <ShieldOff className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Risk Score: {a.risk_score}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <Btn variant="secondary" size="sm">Review</Btn>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center">
                <ShieldOff className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No alerts yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Score an individual account or run a batch to start generating alerts.
              </p>
              <Link to="/score"><Btn variant="secondary" size="sm">Score an account</Btn></Link>
            </div>
          )}
        </GlassCard>

        {/* Feature importance */}
        <GlassCard className="p-5 flex flex-col max-h-[400px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h2 className="font-display text-lg font-semibold">Global feature importance</h2>
              <p className="text-xs text-muted-foreground">
                {features.length > 0 ? "Top features driving model decisions" : "Available after model training"}
              </p>
            </div>
          </div>
          {features.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {features.map((f, i) => {
                const maxImp = Math.max(...features.map(x => x.importance));
                const pct = Math.round((f.importance / maxImp) * 100);
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-foreground/80">{f.feature}</span>
                      <span className="text-muted-foreground">{f.importance.toFixed(4)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center">
                <BarChart2 className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No model loaded</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Train a model first to see SHAP-based feature importance here.
              </p>
              <Link to="/train"><Btn variant="secondary" size="sm">Train a model</Btn></Link>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Activity feed */}
      <div className="mt-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-base font-semibold">Recent activity</h2>
          </div>
          {recent.length > 0 ? (
            <div className="space-y-2">
              {recent.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-2/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: r.risk_tier === 'high' ? 'var(--color-coral)' : r.risk_tier === 'med' ? 'var(--color-gold)' : 'var(--color-success)' }} />
                    <p className="text-sm">Account scored from {r.source.toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Score: {r.risk_score}</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
