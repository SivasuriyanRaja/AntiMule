import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import {
  Btn,
  GlassCard,
  RiskBadge,
  SectionHeader,
} from "@/components/antimule/primitives";
import {
  ScanSearch,
  Workflow,
  Loader2,
  RotateCcw,
  Briefcase,
  FileText,
  UserCheck,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/score")({
  component: Score,
});

const defaultFeatures = [
  { id: "F3894", k: "Account age (months)", placeholder: "e.g. 12" },
  { id: "F2737", k: "Avg tx amount (90d)", placeholder: "e.g. 200.00" },
  { id: "F3836", k: "Tx velocity 24h", placeholder: "e.g. 10" },
  { id: "F2582", k: "Cross-channel activity", placeholder: "e.g. 1.0" },
  { id: "F3888_age_days", k: "Device age (days)", placeholder: "e.g. 90" },
  { id: "F1692", k: "Network Centrality", placeholder: "0.00 – 1.00" },
  { id: "F670", k: "Debit ratio", placeholder: "e.g. 0.85" },
  { id: "F3891", k: "Account Type", placeholder: "e.g. INDIVIDUAL" },
];

// Generate a mock account profile after scoring for the KYC panel
function buildProfile(inputs: Record<string, string>, result: any) {
  const tier: "low" | "med" | "high" =
    result.risk_score >= 70 ? "high" : result.risk_score >= 40 ? "med" : "low";
  const accountAge = inputs["F3894"] ? `${inputs["F3894"]} months` : "—";
  const txVel = inputs["F3836"] || "—";
  const debitRatio = inputs["F670"] ? (parseFloat(inputs["F670"]) * 100).toFixed(0) + "%" : "—";
  return { tier, accountAge, txVel, debitRatio };
}

function Score() {
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("score_inputs");
    return saved ? JSON.parse(saved) : {};
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(() => {
    const saved = localStorage.getItem("score_result");
    return saved ? JSON.parse(saved) : null;
  });
  const [caseCreated, setCaseCreated] = useState(false);

  useEffect(() => {
    localStorage.setItem("score_inputs", JSON.stringify(inputs));
  }, [inputs]);

  useEffect(() => {
    if (result) {
      localStorage.setItem("score_result", JSON.stringify(result));
    } else {
      localStorage.removeItem("score_result");
    }
    setCaseCreated(false);
  }, [result]);

  const handleReset = () => {
    setInputs({});
    setResult(null);
    localStorage.removeItem("score_inputs");
    localStorage.removeItem("score_result");
  };

  const handleScore = async () => {
    setLoading(true);
    try {
      const payload: Record<string, any> = {};
      Object.entries(inputs).forEach(([k, v]) => {
        if (!v) return;
        const num = Number(v);
        payload[k] = isNaN(num) ? v : num;
      });

      const res = await fetch("http://localhost:8005/predict", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === "success") {
        setResult(data.prediction);
      } else {
        alert("Error: " + data.detail);
      }
    } catch {
      alert("Failed to connect to scoring engine.");
    } finally {
      setLoading(false);
    }
  };

  const profile = result ? buildProfile(inputs, result) : null;

  return (
    <AppShell>
      <SectionHeader
        eyebrow={result ? `Screening · Risk Score: ${Math.round(result.risk_score)}` : "Screening · —"}
        title="Customer Screening"
        subtitle="Enter account features to compute an AI-driven AML risk score. Review the SHAP explanation and take action."
        actions={
          <>
            <Btn variant="secondary" onClick={handleReset} disabled={loading}>
              <RotateCcw className="h-4 w-4" />
              Clear
            </Btn>
            <Btn variant="gold" disabled={loading} onClick={handleScore}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanSearch className="h-4 w-4" />
              )}
              {loading ? "Scoring…" : "Run Screen"}
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Features form */}
        <GlassCard className="p-6 xl:col-span-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Account Features</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Enter account characteristics to compute the AML risk score
          </p>
          <div className="space-y-3">
            {defaultFeatures.map((f) => (
              <div key={f.id} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{f.k}</label>
                <input
                  placeholder={f.placeholder}
                  value={inputs[f.id] || ""}
                  onChange={(e) => setInputs({ ...inputs, [f.id]: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                />
              </div>
            ))}
          </div>
          <Btn
            variant="gold"
            disabled={loading}
            onClick={handleScore}
            className="w-full justify-center mt-5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            {loading ? "Scoring…" : "Run Screen"}
          </Btn>
        </GlassCard>

        {/* Risk Dial */}
        <GlassCard className="p-6 xl:col-span-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Risk Score</h2>
          </div>
          <div className="mt-2 flex flex-col items-center justify-center py-4 gap-3 text-center">
            {result ? <RiskDial score={result.risk_score} /> : <RiskDialEmpty />}
            <p className="text-sm text-muted-foreground">
              {result ? "AML risk score computed" : "Enter account features and run screen"}
            </p>
            {result && profile && (
              <div className="w-full mt-2">
                <RiskBadge tier={profile.tier} />
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
            {[
              { label: "Low Risk", range: "0–39", cls: "border-success/30 text-success" },
              { label: "Medium Risk", range: "40–69", cls: "border-gold/30 text-gold" },
              { label: "High Risk", range: "70–100", cls: "border-critical/30 text-critical" },
            ].map((t) => (
              <div key={t.label} className={`rounded-lg border px-2 py-2 ${t.cls}`}>
                <div className="font-semibold">{t.label}</div>
                <div className="opacity-70 mt-0.5">{t.range}</div>
              </div>
            ))}
          </div>

          {/* KYC profile summary after scoring */}
          {result && profile && (
            <div className="mt-4 pt-4 border-t border-border/40 space-y-2 anim-fade-in">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Account Profile
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Account Age", value: profile.accountAge, icon: Clock },
                  { label: "Tx Velocity/24h", value: profile.txVel, icon: ScanSearch },
                  { label: "Debit Ratio", value: profile.debitRatio, icon: Workflow },
                  { label: "Risk Classification", value: profile.tier.toUpperCase(), icon: ShieldAlert },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg bg-surface-2/40 border border-border/30 p-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                    <p className="text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* SHAP + Actions */}
        <div className="xl:col-span-4 space-y-4">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold">Score Explanation</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border/60 rounded-full px-2.5 py-1">
                <Workflow className="h-3 w-3" /> SHAP
              </span>
            </div>
            <div className="flex flex-col py-2 gap-3 min-h-[140px]">
              {result && result.shap_values && Object.keys(result.shap_values).length > 0 ? (
                Object.entries(result.shap_values)
                  .slice(0, 6)
                  .map(([feature, val]: any, idx) => {
                    const abs = Math.abs(val);
                    const max = Math.max(
                      ...Object.values(result.shap_values).map((v: any) => Math.abs(v))
                    );
                    const pct = Math.round((abs / max) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono text-foreground/80 truncate max-w-[60%]">{feature}</span>
                          <span className={val > 0 ? "text-critical font-medium" : "text-success font-medium"}>
                            {(val > 0 ? "+" : "") + val.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${val > 0 ? "bg-critical/70" : "bg-success/70"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <Workflow className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No score to explain yet</p>
                  <p className="text-xs text-muted-foreground">SHAP values appear after screening</p>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="font-display text-base font-semibold mb-3">Rule-Based Alerts</h2>
            <div className="flex flex-col py-2 gap-2 min-h-[80px]">
              {result ? (
                result.alerts?.length > 0 ? (
                  result.alerts.map((a: string, i: number) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-lg border border-critical/30 bg-critical/10 text-critical text-sm flex items-start gap-2"
                    >
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      {a}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-4 gap-2 text-success">
                    <p className="text-sm">No rule alerts triggered</p>
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Rules evaluated after screening
                </p>
              )}
            </div>
          </GlassCard>

          {/* Post-score actions */}
          {result && (
            <GlassCard className="p-6 anim-rise">
              <h2 className="font-display text-base font-semibold mb-3">Recommended Actions</h2>
              <div className="space-y-2">
                <Btn
                  variant={caseCreated ? "secondary" : "gold"}
                  className="w-full justify-center"
                  disabled={caseCreated}
                  onClick={() => setCaseCreated(true)}
                >
                  <Briefcase className="h-4 w-4" />
                  {caseCreated ? "Case Opened ✓" : "Open Investigation Case"}
                </Btn>
                <Btn variant="danger" className="w-full justify-center">
                  <FileText className="h-4 w-4" />
                  File SAR Report
                </Btn>
                <Btn variant="secondary" className="w-full justify-center" onClick={handleReset}>
                  <ScanSearch className="h-4 w-4" />
                  Screen Another Customer
                </Btn>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function RiskDial({ score }: { score: number }) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  let color = "oklch(0.6 0.02 245)";
  if (score > 0) {
    if (score < 40) color = "oklch(0.65 0.16 150)";
    else if (score < 70) color = "oklch(0.78 0.16 72)";
    else color = "oklch(0.62 0.22 25)";
  }

  return (
    <div className="relative h-52 w-52">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} stroke="oklch(1 0 0 / 0.06)" strokeWidth="12" fill="none" />
        <circle
          cx="100" cy="100" r={r}
          stroke={color} strokeWidth="12" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-5xl font-semibold tabular-nums">{Math.round(score)}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">Risk Score</div>
        </div>
      </div>
    </div>
  );
}

function RiskDialEmpty() {
  const r = 78;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-52 w-52">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} stroke="oklch(1 0 0 / 0.06)" strokeWidth="12" fill="none" />
        <circle
          cx="100" cy="100" r={r}
          stroke="oklch(0.5 0.02 245)" strokeWidth="12" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-5xl font-semibold tabular-nums text-muted-foreground">—</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">Risk Score</div>
        </div>
      </div>
    </div>
  );
}
