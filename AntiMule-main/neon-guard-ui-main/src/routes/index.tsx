import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import {
  Btn,
  GlassCard,
  GoldCard,
  MetricTile,
  RiskBadge,
  SectionHeader,
} from "@/components/antimule/primitives";
import {
  Brain,
  UserSearch,
  BarChart2,
  ShieldOff,
  Activity,
  FileText,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/")({
  component: Overview,
});

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
  tier_breakdown?: { high: number; med: number; low: number };
}

const COMPLIANCE_DEADLINES: any[] = [];
const MY_CASES: any[] = [];
function Overview() {
  const [features, setFeatures] = useState<FeatureImportance[]>([]);
  const [bestModel, setBestModel] = useState<ModelMetrics | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  const hasLiveStats = (stats?.total_scored ?? 0) > 0;
  const tierBreakdown = hasLiveStats
    ? stats?.tier_breakdown || {}
    : bestModel?.tier_breakdown || {};

  const distribution = [
    { name: "Low Risk", value: tierBreakdown.low || 0, color: "var(--color-success)" },
    { name: "Medium Risk", value: tierBreakdown.med || 0, color: "var(--color-gold)" },
    { name: "High Risk", value: tierBreakdown.high || 0, color: "var(--color-critical)" },
  ].filter((d) => d.value > 0);

  const barData = [];

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_BASE}/db/stats`, { headers })
      .then((r) => r.json())
      .then((data) => { if (data.total_scored !== undefined) setStats(data); })
      .catch(() => {});

    fetch(`${API_BASE}/db/alerts?limit=5`, { headers })
      .then((r) => r.json())
      .then((data) => { if (data.alerts) setAlerts(data.alerts); })
      .catch(() => {});

    fetch(`${API_BASE}/db/recent?limit=8`, { headers })
      .then((r) => r.json())
      .then((data) => { if (data.results) setRecent(data.results); })
      .catch(() => {});

    fetch(`${API_BASE}/model/feature-importance`)
      .then((r) => r.json())
      .then((data) => { if (data.available && data.features) setFeatures(data.features); })
      .catch(() => {});

    fetch(`${API_BASE}/model/metrics`)
      .then((r) => r.json())
      .then((data) => {
        if (data.available && data.metrics) {
          const best = data.metrics.reduce((prev: ModelMetrics, cur: ModelMetrics) =>
            prev.avg_precision > cur.avg_precision ? prev : cur
          );
          setBestModel(best);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <AppShell>
      <SectionHeader
        eyebrow={`Command Center · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
        title="Officer Dashboard"
        subtitle="Your compliance workstation. Review flagged accounts, manage open cases, and track regulatory deadlines."
        actions={
          <>
            <Link to="/cases">
              <Btn variant="secondary">
                <Briefcase className="h-4 w-4" />
                My Cases
              </Btn>
            </Link>
            <Link to="/score">
              <Btn variant="gold">
                <UserSearch className="h-4 w-4" />
                Screen Customer
              </Btn>
            </Link>
          </>
        }
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricTile
          label="Accounts Screened Today"
          value={stats?.total_scored ?? "—"}
          tone="info"
          icon={<Users className="h-4 w-4" />}
          delta={stats?.total_scored ? `+${stats.total_scored}` : undefined}
        />
        <MetricTile
          label="Open SAR Candidates"
          value={stats?.open_alerts ?? "—"}
          tone="warning"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricTile
          label="Confirmed High-Risk"
          value={stats?.mule_count ?? "—"}
          tone="critical"
          icon={<ShieldOff className="h-4 w-4" />}
        />
        <MetricTile
          label="Detection Accuracy"
          value={bestModel ? `${(bestModel.precision * 100).toFixed(1)}%` : "—"}
          tone="success"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Body grid */}
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Weekly screening chart */}
        <GlassCard className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold">Weekly Screening Activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Accounts screened vs flagged this week</p>
            </div>
            <Link to="/batch">
              <Btn variant="secondary" size="sm">
                Run Batch <ArrowRight className="h-3.5 w-3.5" />
              </Btn>
            </Link>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.025 245 / 0.40)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.60 0.015 245)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.60 0.015 245)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.16 0.028 245)",
                    border: "1px solid oklch(0.28 0.025 245 / 0.70)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "oklch(0.95 0.008 55)",
                  }}
                  itemStyle={{ color: "oklch(0.95 0.008 55)" }}
                  labelStyle={{ color: "oklch(0.95 0.008 55)" }}
                />
                <Bar dataKey="screened" name="Screened" fill="oklch(0.40 0.06 245 / 0.60)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="flagged" name="Flagged" fill="oklch(0.76 0.13 72 / 0.80)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Risk distribution */}
        <GlassCard className="p-5">
          <div className="mb-3">
            <h2 className="font-display text-base font-semibold">Risk Distribution</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasLiveStats ? "Live scoring data" : "From latest model training set"}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[160px]">
            {distribution.length > 0 ? (
              <>
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={65}
                        paddingAngle={3}
                      >
                        {distribution.map((d) => (
                          <Cell key={d.name} fill={d.color} stroke="oklch(0.12 0.025 245)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.16 0.028 245)",
                          border: "1px solid oklch(0.28 0.025 245 / 0.70)",
                          borderRadius: 10,
                          fontSize: 12,
                          color: "oklch(0.95 0.008 55)",
                        }}
                        itemStyle={{ color: "oklch(0.95 0.008 55)" }}
                        labelStyle={{ color: "oklch(0.95 0.008 55)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                  {distribution.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center py-6">
                <ShieldOff className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No data yet</p>
                <p className="text-xs text-muted-foreground">Score accounts to see distribution</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Second row: My cases + Compliance deadlines + Alerts */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My open cases */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <h2 className="font-display text-base font-semibold">My Open Cases</h2>
            </div>
            <Link to="/cases">
              <Btn variant="ghost" size="sm">View all <ArrowRight className="h-3.5 w-3.5" /></Btn>
            </Link>
          </div>
          <div className="space-y-2">
  {MY_CASES.length > 0 ? (
    MY_CASES.map((c) => (
      <div
        key={c.id}
        className="flex items-center justify-between p-3 rounded-lg bg-surface-2/40 border border-border/40 hover:bg-surface-2/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-2 w-2 rounded-full shrink-0 ${
              c.tier === "high"
                ? "bg-critical"
                : c.tier === "med"
                ? "bg-gold"
                : "bg-success"
            }`}
          />
          <div>
            <p className="text-sm font-medium">{c.id}</p>
            <p className="text-xs text-muted-foreground">{c.account}</p>
          </div>
        </div>
        <div className="text-right">
          <RiskBadge tier={c.tier} />
          <p className="text-[10px] text-muted-foreground mt-1">
            {c.age} old
          </p>
        </div>
      </div>
    ))
  ) : (
    <div className="text-center py-6">
      <p className="text-sm text-muted-foreground">
        No open cases available
      </p>
    </div>
  )}
</div>
            
        </GlassCard>

        {/* Compliance deadlines */}
        <GoldCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Compliance Deadlines</h2>
          </div>
          <div className="space-y-3">
  {COMPLIANCE_DEADLINES.length > 0 ? (
    COMPLIANCE_DEADLINES.map((d) => (
      <div key={d.label} className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1">
          {d.urgent ? (
            <AlertTriangle className="h-4 w-4 text-critical shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium">{d.label}</p>
            <p className="text-xs text-muted-foreground">{d.due}</p>
          </div>
        </div>
        <span
          className={`badge-sm font-semibold shrink-0 ${
            d.urgent
              ? "bg-critical/15 text-critical border border-critical/30"
              : "bg-success/15 text-success border border-success/30"
          }`}
        >
          {d.daysLeft}d
        </span>
      </div>
    ))
  ) : (
    <div className="text-center py-6">
      <p className="text-sm text-muted-foreground">
        No compliance deadlines available
      </p>
    </div>
  )}
</div>
          </div>
          <hr className="divider-gold my-4" />
          <Link to="/reports">
            <Btn variant="gold" size="sm" className="w-full justify-center">
              <FileText className="h-4 w-4" />
              View SAR Reports
            </Btn>
          </Link>
        </GoldCard>

        {/* Recent high-risk alerts */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-critical" />
              <h2 className="font-display text-base font-semibold">Risk Alerts</h2>
            </div>
          </div>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.slice(0, 4).map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-critical/5 border border-critical/20 hover:bg-critical/10 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">Risk Score: {a.risk_score}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Btn variant="secondary" size="sm">Review</Btn>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm text-muted-foreground">No active alerts</p>
              <p className="text-xs text-muted-foreground">
                Score accounts to generate risk alerts
              </p>
              <Link to="/score" className="mt-2">
                <Btn variant="secondary" size="sm">Screen Customer</Btn>
              </Link>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent activity feed */}
      <div className="mt-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold">Recent Screening Activity</h2>
            </div>
            {features.length > 0 && (
              <Link to="/insights">
                <Btn variant="ghost" size="sm">
                  <BarChart2 className="h-4 w-4" /> Model insights
                </Btn>
              </Link>
            )}
          </div>
          {recent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-muted-foreground border-b border-border/40">
                    <th className="text-left pb-3 font-medium">Risk Tier</th>
                    <th className="text-left pb-3 font-medium">Score</th>
                    <th className="text-left pb-3 font-medium">Source</th>
                    <th className="text-left pb-3 font-medium">Timestamp</th>
                    <th className="text-right pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {recent.map((r, i) => (
                    <tr key={i} className="hover:bg-surface-2/30 transition-colors">
                      <td className="py-3">
                        <RiskBadge
                          tier={r.risk_tier === "high" ? "high" : r.risk_tier === "med" ? "med" : "low"}
                        />
                      </td>
                      <td className="py-3 font-mono font-medium tabular-nums">{r.risk_score}</td>
                      <td className="py-3 text-muted-foreground">{r.source?.toUpperCase()}</td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <Btn variant="ghost" size="sm">
                          <Brain className="h-3.5 w-3.5" /> Review
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Activity className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No screening activity recorded.</p>
              <p className="text-xs text-muted-foreground">
                Screen an individual customer or run a batch to get started.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
