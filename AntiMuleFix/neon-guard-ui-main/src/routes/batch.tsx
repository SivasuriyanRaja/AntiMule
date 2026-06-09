import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import { Btn, GlassCard, Pill, SectionHeader } from "@/components/antimule/primitives";
import {
  Download, FileUp, Filter, CheckCircle2, XCircle,
  TableProperties, Loader2, AlertCircle, RefreshCw
} from "lucide-react";
import React, { useState, useRef } from "react";
import {
  Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";

export const Route = createFileRoute("/batch")({ component: Batch });

const API_BASE = "http://localhost:8005";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function tierColor(tier: string) {
  const t = (tier || "").toUpperCase();
  if (t === "CRITICAL" || t === "HIGH")   return "#e74c3c";
  if (t === "MEDIUM")                      return "#f1c40f";
  return "#27ae60";
}

function Batch() {
  const [file,      setFile]      = useState<File | null>(null);
  const [fileName,  setFileName]  = useState("");
  const [fileSize,  setFileSize]  = useState("");
  const [fileError, setFileError] = useState("");
  const [isDragging,setIsDragging]= useState(false);

  // Two modes: "preview" = client-side parse, "scored" = real API results
  const [mode,       setMode]      = useState<"idle"|"preview"|"scored">("idle");
  const [loading,    setLoading]   = useState(false);
  const [apiError,   setApiError]  = useState("");

  // Preview state (client-side CSV parse)
  const [headers,    setHeaders]   = useState<string[]>([]);
  const [rows,       setRows]      = useState<string[][]>([]);
  const [totalEst,   setTotalEst]  = useState(0);

  // Scored state (real API results)
  const [scanId,     setScanId]    = useState("");
  const [summary,    setSummary]   = useState<any>(null);
  const [results,    setResults]   = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── File parsing (preview only — reads headers + first 200 rows) ──────────
  function processFile(f: File) {
    setFileError(""); setHeaders([]); setRows([]);
    setMode("idle"); setApiError(""); setResults([]); setSummary(null);
    setFileName(f.name); setFileSize(formatSize(f.size)); setFile(f);

    if (!f.name.match(/\.(csv|tsv|txt)$/i)) {
      setFileError("Only CSV files are supported."); return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? "");
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { setFileError("File needs a header + at least 1 row."); return; }
        const hdrs = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const dataLines = lines.slice(1, 201);
        const avgLen = dataLines.reduce((s, l) => s + l.length + 1, 0) / Math.max(dataLines.length, 1);
        setHeaders(hdrs);
        setRows(dataLines.map(l => l.split(",").map(v => v.trim().replace(/^"|"$/g, ""))));
        setTotalEst(Math.max(0, Math.round((f.size - lines[0].length) / avgLen)));
        setMode("preview");
      } catch { setFileError("Could not parse CSV."); }
    };
    reader.readAsText(f.slice(0, 512 * 1024)); // read 512KB for preview
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (f) processFile(f);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0]; if (f) processFile(f);
  }

  // ── Real API scoring ───────────────────────────────────────────────────────
  async function runScoring() {
    if (!file) return;
    setLoading(true); setApiError(""); setResults([]); setSummary(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/predict/batch`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setScanId(data.scan_id || "");
      setSummary(data.summary || {});
      setResults(data.predictions || []);
      setMode("scored");
    } catch (err: any) {
      setApiError(err.message || "Scoring failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  function exportCSV() {
    const exportRows = mode === "scored" ? results : [];
    if (!exportRows.length) return;
    const keys = Object.keys(exportRows[0]);
    const csv = [keys.join(","), ...exportRows.map(r => keys.map(k => r[k] ?? "").join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `scored_${fileName}`; a.click();
  }

  function handleReset() {
    setFile(null); setFileName(""); setFileSize(""); setFileError("");
    setHeaders([]); setRows([]); setTotalEst(0);
    setMode("idle"); setApiError(""); setResults([]); setSummary(null); setScanId("");
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const isScored = mode === "scored" && results.length > 0;

  const tierCounts = isScored
    ? results.reduce((acc: any, r) => {
        const t = (r.risk_tier || "LOW").toUpperCase();
        acc[t] = (acc[t] || 0) + 1; return acc;
      }, {})
    : {};

  const distribution = [
    { name: "Low",      value: (tierCounts["LOW"]      || 0), color: "#27ae60" },
    { name: "Medium",   value: (tierCounts["MEDIUM"]   || 0), color: "#f1c40f" },
    { name: "High",     value: (tierCounts["HIGH"]      || 0), color: "#e67e22" },
    { name: "Critical", value: (tierCounts["CRITICAL"] || 0), color: "#e74c3c" },
  ].filter(d => d.value > 0);

  const histogram = isScored
    ? Array.from({ length: 10 }, (_, i) => ({
        range: `${i * 10}–${i * 10 + 10}`,
        count: results.filter(r => (r.risk_score || 0) >= i * 10 && (r.risk_score || 0) < (i + 1) * 10).length,
      }))
    : [];

  const previewCols = headers.slice(0, 4);

  return (
    <AppShell>
      <SectionHeader
        eyebrow={isScored ? `Batch · ${summary?.total?.toLocaleString()} scored` : mode === "preview" ? `Preview · ~${totalEst.toLocaleString()} rows` : "Batch · no active run"}
        title="Batch Scoring"
        subtitle={
          isScored
            ? `Scan ID: ${scanId} · ${summary?.mule_pct?.toFixed(1)}% mule rate · avg risk ${summary?.avg_risk?.toFixed(1)}`
            : mode === "preview"
            ? `${fileName} · ${fileSize} · ${headers.length} columns — ready to score`
            : "Upload a CSV file to score all accounts at once."
        }
        actions={
          <>
            <Btn variant="secondary" onClick={handleReset} disabled={mode === "idle" && !fileName}>Reset</Btn>
            {mode === "preview" && (
              <Btn onClick={runScoring} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {loading ? "Scoring…" : "Run Scoring"}
              </Btn>
            )}
            {isScored && (
              <Btn onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Btn>
            )}
          </>
        }
      />

      {/* API error banner */}
      {apiError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span><strong>Scoring failed:</strong> {apiError}</span>
          <Btn variant="ghost" size="sm" onClick={runScoring} className="ml-auto">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Retry
          </Btn>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* ── Upload card ── */}
        <GlassCard tone="info" className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Upload batch</h2>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">CSV up to 500 MB · drag & drop or click</p>

          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed cursor-pointer p-6 text-center select-none transition-all ${
              isDragging ? "border-primary bg-primary/15"
              : isScored ? "border-green-500/50 bg-green-500/5"
              : mode === "preview" ? "border-blue-500/50 bg-blue-500/5"
              : fileError ? "border-red-400/40 bg-red-500/5"
              : "border-primary/40 bg-primary/5 hover:bg-primary/10"
            }`}
          >
            {loading ? (
              <><Loader2 className="h-7 w-7 mx-auto animate-spin text-primary" /><div className="mt-2 text-xs text-muted-foreground">Scoring accounts…</div></>
            ) : isScored ? (
              <><CheckCircle2 className="h-7 w-7 mx-auto text-green-400" /><div className="mt-2 text-sm font-medium truncate">{fileName}</div><div className="text-xs text-muted-foreground mt-0.5">Scored · click to change file</div></>
            ) : mode === "preview" ? (
              <><FileUp className="h-7 w-7 mx-auto text-blue-400" /><div className="mt-2 text-sm font-medium truncate">{fileName}</div><div className="text-xs text-muted-foreground mt-0.5">{fileSize} · {headers.length} cols · ready to score</div></>
            ) : fileError ? (
              <><XCircle className="h-7 w-7 mx-auto text-red-400" /><div className="mt-2 text-xs text-red-400">{fileError}</div></>
            ) : (
              <><FileUp className="h-7 w-7 mx-auto text-primary" /><div className="mt-2 text-sm font-medium">Drop CSV here</div><div className="text-xs text-muted-foreground mt-0.5">or click to browse</div></>
            )}
            <input ref={inputRef} type="file" accept=".csv,.tsv,.txt" className="sr-only" onChange={handleChange} />
          </div>

          {/* Summary tiles */}
          {isScored && summary && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["Total", summary.total?.toLocaleString()],
                ["Mules",   summary.mule_count],
                ["Mule %",  `${summary.mule_pct?.toFixed(1)}%`],
                ["Avg Risk",`${summary.avg_risk?.toFixed(1)}`],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-lg bg-surface-2/60 border border-border/40 p-2.5 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">{k}</div>
                  <div className="font-display text-base font-semibold">{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Preview file info */}
          {mode === "preview" && !isScored && (
            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated rows</span><span>~{totalEst.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Columns</span><span>{headers.length}</span></div>
              <div className="mt-3">
                <div className="text-[10px] uppercase text-muted-foreground mb-1">Detected columns</div>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-auto">
                  {headers.slice(0, 12).map(h => (
                    <span key={h} className="text-[10px] font-mono bg-surface-2/60 border border-border/40 px-1.5 py-0.5 rounded">{h}</span>
                  ))}
                  {headers.length > 12 && <span className="text-[10px] text-muted-foreground">+{headers.length - 12} more</span>}
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* ── Pie chart ── */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Tier distribution</h2>
          {isScored && distribution.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {distribution.map(d => <Cell key={d.name} fill={d.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v.toLocaleString(), "Accounts"]}
                    contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 10, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center">
                <TableProperties className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {mode === "preview" ? "Click 'Run Scoring' to generate distribution" : "Upload a file to see tier distribution"}
              </p>
            </div>
          )}
        </GlassCard>

        {/* ── Histogram ── */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Risk histogram</h2>
          {isScored && histogram.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogram} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="range" stroke="oklch(0.7 0.02 260)" fontSize={9} angle={-45} textAnchor="end" height={40} />
                  <YAxis stroke="oklch(0.7 0.02 260)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--color-primary, #6366f1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center">
                <Filter className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {mode === "preview" ? "Score to see risk histogram" : "Risk distribution appears after scoring"}
              </p>
            </div>
          )}
        </GlassCard>

        {/* ── Results table ── */}
        <GlassCard className="p-0 xl:col-span-12 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <div>
              <h2 className="font-display text-lg font-semibold">
                {isScored ? "Scored results — highest risk first" : mode === "preview" ? "Data preview" : "No results yet"}
              </h2>
              {isScored && <p className="text-xs text-muted-foreground mt-0.5">Showing top 50 of {results.length} scored accounts</p>}
            </div>
            {isScored && <Pill tone="high">{(tierCounts["HIGH"] || 0) + (tierCounts["CRITICAL"] || 0)} need review</Pill>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                {isScored ? (
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-3 py-3 font-medium">Risk Score</th>
                    <th className="text-left px-3 py-3 font-medium">Tier</th>
                    <th className="text-left px-3 py-3 font-medium">Prediction</th>
                    <th className="text-left px-3 py-3 font-medium">ML Prob</th>
                    <th className="text-left px-3 py-3 font-medium">Anomaly</th>
                    <th className="text-right px-5 py-3 font-medium">Action</th>
                  </tr>
                ) : (
                  <tr>
                    {previewCols.map(h => <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>)}
                    <th className="text-right px-5 py-3 font-medium">…</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-border/40">
                {isScored ? (
                  [...results]
                    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
                    .slice(0, 50)
                    .map((r, i) => (
                      <tr key={i} className={`hover:bg-surface-2/30 transition-colors ${
                        (r.risk_tier || "").toUpperCase() === "CRITICAL" ? "bg-red-500/5" : ""
                      }`}>
                        <td className="px-5 py-3 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-surface-2 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${r.risk_score || 0}%`,
                                background: tierColor(r.risk_tier)
                              }} />
                            </div>
                            <span className="tabular-nums text-xs font-medium">{(r.risk_score || 0).toFixed(0)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Pill tone={
                            (r.risk_tier || "").toUpperCase() === "CRITICAL" ? "high" :
                            (r.risk_tier || "").toUpperCase() === "HIGH" ? "high" :
                            (r.risk_tier || "").toUpperCase() === "MEDIUM" ? "med" : "low"
                          }>
                            {r.risk_tier || "LOW"}
                          </Pill>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-medium ${r.prediction === 1 ? "text-red-400" : "text-green-400"}`}>
                            {r.prediction === 1 ? "🚨 Mule" : "✅ Legit"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs tabular-nums text-muted-foreground">
                          {r.ml_probability !== undefined ? `${(r.ml_probability * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs tabular-nums text-muted-foreground">
                          {r.anomaly_score !== undefined ? `${(r.anomaly_score * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Btn variant="ghost" size="sm">Review</Btn>
                        </td>
                      </tr>
                    ))
                ) : mode === "preview" && rows.length > 0 ? (
                  rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="hover:bg-surface-2/30">
                      {previewCols.map((_, ci) => (
                        <td key={ci} className="px-5 py-2.5 text-xs text-muted-foreground truncate max-w-[140px]">
                          {row[ci] ?? "—"}
                        </td>
                      ))}
                      <td className="px-5 py-2.5 text-right text-xs text-muted-foreground">…</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-muted-foreground text-sm">
                      {mode === "idle" ? "Upload a CSV file to see results here." : "Scoring in progress…"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
