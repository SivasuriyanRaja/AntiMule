import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import {
  Btn,
  GlassCard,
  MetricTile,
  SectionHeader,
} from "@/components/cybershield/primitives";
import { Brain, UserSearch, BarChart2, ShieldOff, Activity } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Overview,
});

function Overview() {
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

      {/* KPI row — empty */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricTile label="Transactions scored" value="—" tone="info" />
        <MetricTile label="Suspicious flagged" value="—" tone="warning" />
        <MetricTile label="Confirmed mule" value="—" tone="critical" />
        <MetricTile label="Model precision" value="—" tone="success" />
      </div>

      {/* Body grid */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent alerts — empty state */}
        <GlassCard className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Recent alerts</h2>
              <p className="text-xs text-muted-foreground">Alerts will appear here as accounts are scored</p>
            </div>
          </div>
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
        </GlassCard>

        {/* Feature importance — empty state */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-display text-lg font-semibold">Global feature importance</h2>
              <p className="text-xs text-muted-foreground">Available after model training</p>
            </div>
          </div>
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
        </GlassCard>
      </div>

      {/* Activity feed — empty state */}
      <div className="mt-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-base font-semibold">Recent activity</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
