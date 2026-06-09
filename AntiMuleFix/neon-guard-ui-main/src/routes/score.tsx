import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/antimule/primitives";
import { ScanSearch, Workflow, Loader2, RotateCcw } from "lucide-react";
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

  useEffect(() => {
    localStorage.setItem("score_inputs", JSON.stringify(inputs));
  }, [inputs]);

  useEffect(() => {
    if (result) {
      localStorage.setItem("score_result", JSON.stringify(result));
    } else {
      localStorage.removeItem("score_result");
    }
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
          'Authorization': `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === "success") {
        setResult(data.prediction);
      } else {
        alert("Error: " + data.detail);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to compute score.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <AppShell>
      <SectionHeader
        eyebrow={result ? `Risk: ${Math.round(result.risk_score)}/100 · ${result.risk_tier || ""} · ${result.prediction === 1 ? "🚨 MULE" : "✅ LEGIT"}` : "Account · —"}
        title="Single Account Score"
        subtitle="Fill in the account features on the left, then run the model to see the risk score."
        actions={
          <>
            <Btn variant="secondary" onClick={handleReset} disabled={loading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Btn>
            <Btn disabled={loading} onClick={handleScore}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ScanSearch className="h-4 w-4 mr-2" />}
              {loading ? "Scoring..." : "Run score"}
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Features form */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Account features</h2>
          <p className="text-xs text-muted-foreground mb-4">Enter values to compute the risk score</p>
          <div className="space-y-3">
            {defaultFeatures.map((f) => (
              <div key={f.id} className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground w-40 shrink-0">{f.k}</label>
                <input
                  placeholder={f.placeholder}
                  value={inputs[f.id] || ""}
                  onChange={(e) => setInputs({ ...inputs, [f.id]: e.target.value })}
                  className="flex-1 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
                />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Risk dial — empty */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Risk probability</h2>
          <div className="mt-4 flex flex-col items-center justify-center py-8 gap-3 text-center">
            {result ? <RiskDial score={result.risk_score} /> : <RiskDialEmpty />}
            <p className="text-sm text-muted-foreground">{result ? "Score computed successfully" : "Score not computed yet"}</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {result ? "Risk prediction based on currently deployed model and inputs." : "Fill in the account features and click \"Run score\" to see the result."}
            </p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-lg border border-border/60 text-muted-foreground px-2 py-1.5">
              <div className="font-medium">Legit</div><div className="opacity-80">0–39</div>
            </div>
            <div className="rounded-lg border border-border/60 text-muted-foreground px-2 py-1.5">
              <div className="font-medium">Review</div><div className="opacity-80">40–69</div>
            </div>
            <div className="rounded-lg border border-border/60 text-muted-foreground px-2 py-1.5">
              <div className="font-medium">Mule</div><div className="opacity-80">70–100</div>
            </div>
          </div>
        </GlassCard>

        {/* SHAP + rules — empty */}
        <div className="xl:col-span-4 space-y-4">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">Why this score</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border/60 rounded-full px-2.5 py-1">
                <Workflow className="h-3 w-3" /> SHAP
              </span>
            </div>
            <div className="flex flex-col py-2 gap-2.5 min-h-[140px]">
              {result && result.shap_values && Object.keys(result.shap_values).length > 0 ? (() => {
                const entries = Object.entries(result.shap_values as Record<string, number>)
                  .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6);
                const maxAbs = Math.max(...entries.map(([,v]) => Math.abs(v)), 0.001);
                return entries.map(([feature, val], idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-foreground/70 truncate max-w-[120px]">{feature}</span>
                      <span className={val > 0 ? "text-red-400 font-medium" : "text-green-400 font-medium"}>
                        {(val > 0 ? "+" : "") + val.toFixed(4)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${val > 0 ? "bg-red-400/70" : "bg-green-400/70"}`}
                        style={{ width: `${Math.round((Math.abs(val) / maxAbs) * 100)}%` }}
                      />
                    </div>
                  </div>
                ));
              })() : (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center h-full">
                  <p className="text-sm text-muted-foreground">No score to explain yet</p>
                  <p className="text-xs text-muted-foreground">🔴 Red = raises risk · 🟢 Green = lowers risk</p>
                </div>
              )}
              {result && result.shap_values && (
                <p className="text-[10px] text-muted-foreground mt-1 border-t border-border/40 pt-2">
                  🔴 Positive SHAP = increases mule probability · 🟢 Negative = decreases it
                </p>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="font-display text-lg font-semibold mb-3">Rule-based alerts</h2>
            <div className="flex flex-col py-2 gap-2 min-h-[100px]">
              {result ? (
                result.alerts?.length > 0 ? (
                  result.alerts.map((a: string, i: number) => (
                    <div key={i} className="px-3 py-2 rounded border border-critical/30 bg-critical/10 text-critical text-sm">
                      {a}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">No alerts triggered</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <p className="text-sm text-muted-foreground">No alerts triggered</p>
                  <p className="text-xs text-muted-foreground">Rules will be evaluated after scoring</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}

function RiskDial({ score }: { score: number }) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  
  let color = "oklch(0.6 0.02 260)"; // gray
  if (score > 0) {
    if (score < 40) color = "oklch(0.7 0.15 150)"; // green
    else if (score < 70) color = "oklch(0.75 0.18 80)"; // yellow
    else color = "oklch(0.6 0.25 25)"; // red
  }

  return (
    <div className="relative h-56 w-56">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="14" fill="none" />
        <circle
          cx="100" cy="100" r={r}
          stroke={color} strokeWidth="14" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-5xl font-semibold tabular-nums text-foreground">{Math.round(score)}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">of 100</div>
        </div>
      </div>
    </div>
  );
}

function RiskDialEmpty() {
  const r = 78;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-56 w-56">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="14" fill="none" />
        <circle
          cx="100" cy="100" r={r}
          stroke="oklch(0.6 0.02 260)" strokeWidth="14" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-5xl font-semibold tabular-nums text-muted-foreground">—</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">of 100</div>
        </div>
      </div>
    </div>
  );
}
