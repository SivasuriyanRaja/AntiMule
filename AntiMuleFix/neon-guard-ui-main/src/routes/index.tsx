import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import { Btn, GlassCard, MetricTile, SectionHeader } from "@/components/antimule/primitives";
import { Brain, UserSearch, BarChart2, ShieldOff, Activity, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/")(({ component: Overview }));

const API_BASE = "http://localhost:8005";

function authHeaders() {
  const t = localStorage.getItem("auth_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function tierColor(tier: string) {
  if (!tier) return "#8b949e";
  const t = tier.toUpperCase();
  if (t === "CRITICAL" || t === "HIGH" || t === "high") return "var(--color-coral, #e74c3c)";
  if (t === "MEDIUM" || t === "med")  return "var(--color-gold, #f1c40f)";
  return "var(--color-success, #27ae60)";
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function activityLabel(r: any) {
  const tier  = (r.risk_tier || "").toUpperCase();
  const score = r.risk_score ?? "—";
  const src   = (r.source || "api").toUpperCase();
  const pred  = r.prediction === 1 ? "🚨 Mule account flagged" : "✅ Account cleared";
  return `${pred} — Risk ${score} (${tier}) via ${src}`;
}

function Overview() {
  const [features,   setFeatures]   = useState<any[]>([]);
  const [bestModel,  setBestModel]  = useState<any>(null);
  const [stats,      setStats]      = useState<any>(null);
  const [alerts,     setAlerts]     = useState<any[]>([]);
  const [recent,     setRecent]     = useState<any[]>([]);
  const [allMetrics, setAllMetrics] = useState<any[]>([]);

  useEffect(() => {
    const h = authHeaders();

    fetch(`${API_BASE}/db/stats`, { headers: h })
      .then(r => r.json()).then(d => { if (d.total_scored !== undefined) setStats(d); }).catch(() => {});

    fetch(`${API_BASE}/db/alerts?limit=5`, { headers: h })
      .then(r => r.json()).then(d => { if (d.alerts) setAlerts(d.alerts); }).catch(() => {});

    fetch(`${API_BASE}/db/recent?limit=10`, { headers: h })
      .then(r => r.json()).then(d => { if (d.results) setRecent(d.results); }).catch(() => {});

    fetch(`${API_BASE}/model/feature-importance`)
      .then(r => r.json()).then(d => { if (d.available && d.features) setFeatures(d.features); }).catch(() => {});

    fetch(`${API_BASE}/model/metrics`)
      .then(r => r.json())
      .then(d => {
        if (d.available && d.metrics) {
          setAllMetrics(d.metrics);
          const best = d.metrics.reduce((p: any, c: any) => p.avg_precision > c.avg_precision ? p : c);
          setBestModel(best);
        }
      }).catch(() => {});
  }, []);

  // ── Class distribution — use live DB stats, fallback to model training distribution
  const tierBreakdown = stats?.tier_breakdown || {};
  const hasLiveData   = stats?.total_scored > 0;

  // Map tier keys robustly (handle LOW/low/MEDIUM/med/HIGH/CRITICAL etc.)
  const getCount = (keys: string[]) =>
    keys.reduce((sum, k) => sum + (tierBreakdown[k] || 0), 0);

  const distribution = [
    { name: "Legitimate",   value: getCount(["LOW", "low", "LEGIT", "legit"]),          color: "#27ae60" },
    { name: "Under Review", value: getCount(["MEDIUM", "medium", "med", "MED"]),         color: "#f1c40f" },
    { name: "High Risk",    value: getCount(["HIGH", "high", "CRITICAL", "critical"]),   color: "#e74c3c" },
  ].filter(d => d.value > 0);

  // If no tier data but we have mule/legit counts, build from those
  const fallbackDistribution = (!distribution.length && stats?.total_scored > 0) ? [
    { name: "Legitimate", value: stats.legit_count || 0,  color: "#27ae60" },
    { name: "Mule",       value: stats.mule_count  || 0,  color: "#e74c3c" },
  ].filter(d => d.value > 0) : distribution;

  const chartData = fallbackDistribution.length > 0 ? fallbackDistribution : distribution;

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Dashboard · Live"
        title="Operations Overview"
        subtitle={hasLiveData ? `${stats.total_scored.toLocaleString()} accounts processed` : "Train a model or score an account to get started."}
        actions={
          <>
            <Link to="/train"><Btn variant="secondary"><Brain className="h-4 w-4" />Train model</Btn></Link>
            <Link to="/score"><Btn><UserSearch className="h-4 w-4" />Score account</Btn></Link>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricTile label="Accounts scored"   value={stats?.total_scored ?? "—"} tone="info" />
        <MetricTile label="Open alerts"       value={stats?.open_alerts  ?? "—"} tone="warning" />
        <MetricTile label="Mule accounts"     value={stats?.mule_count   ?? "—"} tone="critical" />
        <MetricTile label="Model precision"   value={bestModel ? `${(bestModel.precision * 100).toFixed(1)}%` : "—"} tone="success" />
      </div>

      {/* Body grid */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Risk distribution + Alerts */}
        <GlassCard className="xl:col-span-2 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Risk Distribution</h2>
              <p className="text-xs text-muted-foreground">
                {hasLiveData ? "Live data from scored accounts" : "No scored accounts yet"}
              </p>
            </div>
            {hasLiveData && (
              <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">Live</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* Pie chart */}
            <div className="flex flex-col items-center justify-center min-h-[200px]">
              {chartData.length > 0 ? (
                <div className="h-full w-full max-h-[260px]">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {chartData.map((d) => (
                          <Cell key={d.name} fill={d.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [val.toLocaleString(), "Accounts"]}
                        contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 10, fontSize: 12 }}
                      />
                      <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center">
                    <ShieldOff className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No data yet</p>
                  <p className="text-xs text-muted-foreground max-w-[180px]">Score accounts to see live distribution</p>
                </div>
              )}
            </div>

            {/* Alerts list */}
            <div className="flex flex-col justify-center">
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    Recent high-risk alerts
                  </p>
                  {alerts.slice(0, 4).map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-2/40 border border-red-500/20 hover:bg-surface-2/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                          <ShieldOff className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Risk Score: <span className="text-red-400">{a.risk_score}</span></p>
                          <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                          {a.alert_reason && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">{a.alert_reason}</p>}
                        </div>
                      </div>
                      <Link to="/batch">
                        <Btn variant="secondary" size="sm">Review</Btn>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-500/10 grid place-items-center">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-green-400">All clear</p>
                  <p className="text-xs text-muted-foreground max-w-[180px]">No high-risk alerts at this time.</p>
                  <Link to="/score"><Btn variant="secondary" size="sm">Score an account</Btn></Link>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Feature importance */}
        <GlassCard className="p-5 flex flex-col max-h-[420px]">
          <div className="mb-4 shrink-0">
            <h2 className="font-display text-lg font-semibold">Feature Importance</h2>
            <p className="text-xs text-muted-foreground">
              {features.length > 0 ? "Top SHAP-driven features" : "Available after training"}
            </p>
          </div>
          {features.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {features.map((f, i) => {
                const maxImp = Math.max(...features.map(x => x.importance));
                const pct = Math.round((f.importance / maxImp) * 100);
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-foreground/80 truncate max-w-[120px]">{f.feature}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{(f.importance * 100).toFixed(2)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary/80 to-primary/40 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center">
                <BarChart2 className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No model loaded</p>
              <p className="text-xs text-muted-foreground max-w-xs">Train a model to see SHAP-based feature importance.</p>
              <Link to="/train"><Btn variant="secondary" size="sm">Train a model</Btn></Link>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Model comparison (multi-model) */}
      {allMetrics.length > 0 && (
        <div className="mt-4">
          <GlassCard className="p-5">
            <h2 className="font-display text-base font-semibold mb-4">Model Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium">Model</th>
                    <th className="text-right py-2 pr-4 font-medium">ROC-AUC</th>
                    <th className="text-right py-2 pr-4 font-medium">Precision</th>
                    <th className="text-right py-2 pr-4 font-medium">Recall</th>
                    <th className="text-right py-2 font-medium">F1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {allMetrics.map((m, i) => (
                    <tr key={i} className={`hover:bg-surface-2/30 transition-colors ${m === bestModel ? "bg-primary/5" : ""}`}>
                      <td className="py-2.5 pr-4 font-mono text-xs">
                        {m === bestModel && <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary mr-2" />}
                        {m.model}
                      </td>
                      <td className="text-right py-2.5 pr-4 font-medium text-primary">{(m.roc_auc * 100).toFixed(2)}%</td>
                      <td className="text-right py-2.5 pr-4">{(m.precision * 100).toFixed(1)}%</td>
                      <td className="text-right py-2.5 pr-4">{(m.recall * 100).toFixed(1)}%</td>
                      <td className="text-right py-2.5">{m.f1_score ? (m.f1_score * 100).toFixed(1) + "%" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Activity feed */}
      <div className="mt-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-base font-semibold">Recent Activity</h2>
            {recent.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{recent.length} recent records</span>
            )}
          </div>
          {recent.length > 0 ? (
            <div className="space-y-1.5">
              {recent.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-2/30 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tierColor(r.risk_tier) }} />
                    <p className="text-sm truncate">{activityLabel(r)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                      <Clock className="h-3 w-3" />{timeAgo(r.created_at)}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      (r.risk_tier || "").toUpperCase() === "CRITICAL" ? "bg-red-500/10 text-red-400" :
                      (r.risk_tier || "").toUpperCase() === "HIGH"     ? "bg-orange-500/10 text-orange-400" :
                      (r.risk_tier || "").toUpperCase() === "MEDIUM"   ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-green-500/10 text-green-400"
                    }`}>{r.risk_tier || "LOW"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              <p className="text-xs text-muted-foreground">Score an account or run a batch to see activity here.</p>
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
