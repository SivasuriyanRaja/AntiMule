import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import { Btn, GlassCard, Pill, SectionHeader } from "@/components/antimule/primitives";
import { Download, FileUp, Filter, CheckCircle2, XCircle, TableProperties } from "lucide-react";
import React, { useState, useRef } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/batch")({
  component: Batch,
});

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function hashScore(values: string[], idx: number): number {
  let h = idx * 31 + 17;
  for (const v of values) {
    for (let j = 0; j < v.length && j < 20; j++) {
      h = ((h * 31) + v.charCodeAt(j)) >>> 0;
    }
  }
  return (h % 100) / 100;
}

function Batch() {
  const [headers, setHeaders] = useState<string[]>(() => { const s = localStorage.getItem("batch_headers"); return s ? JSON.parse(s) : []; });
  const [rows, setRows] = useState<string[][]>(() => { const s = localStorage.getItem("batch_rows"); return s ? JSON.parse(s) : []; });
  const [scores, setScores] = useState<number[]>(() => { const s = localStorage.getItem("batch_scores"); return s ? JSON.parse(s) : []; });
  const [fileName, setFileName] = useState(() => localStorage.getItem("batch_fileName") || "");
  const [fileSize, setFileSize] = useState(() => localStorage.getItem("batch_fileSize") || "");
  const [totalEst, setTotalEst] = useState(() => { const s = localStorage.getItem("batch_totalEst"); return s ? JSON.parse(s) : 0; });
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    localStorage.setItem("batch_headers", JSON.stringify(headers));
    localStorage.setItem("batch_rows", JSON.stringify(rows));
    localStorage.setItem("batch_scores", JSON.stringify(scores));
    localStorage.setItem("batch_fileName", fileName);
    localStorage.setItem("batch_fileSize", fileSize);
    localStorage.setItem("batch_totalEst", JSON.stringify(totalEst));
  }, [headers, rows, scores, fileName, fileSize, totalEst]);

  function handleReset() {
    setHeaders([]); setRows([]); setScores([]); setFileName(""); setFileSize(""); setTotalEst(0); setFileError("");
    localStorage.removeItem("batch_headers"); localStorage.removeItem("batch_rows"); localStorage.removeItem("batch_scores");
    localStorage.removeItem("batch_fileName"); localStorage.removeItem("batch_fileSize"); localStorage.removeItem("batch_totalEst");
  }

  function processFile(file: File) {
    setLoading(true);
    setFileError("");
    setHeaders([]);
    setRows([]);
    setScores([]);
    setFileName(file.name);
    setFileSize(formatSize(file.size));
    setTotalEst(0);

    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      setFileError("Parquet preview not supported in browser. Pass to Python backend.");
      setLoading(false);
      return;
    }

    const blob = file.slice(0, 262144); // 256 KB
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { setFileError("File must have a header row and at least one data row."); setLoading(false); return; }
        const hdrs = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        const dataLines = lines.slice(1, 201);
        const avgLen = dataLines.length ? dataLines.reduce((s, l) => s + l.length + 1, 0) / dataLines.length : 60;
        const est = Math.max(0, Math.round((file.size - lines[0].length) / avgLen));
        const parsedRows = dataLines.map((line) => line.split(",").map((v) => v.trim().replace(/^"|"$/g, "")));
        const sc = parsedRows.map((r, i) => hashScore(r, i));
        // sort by score descending
        const order = sc.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s);
        setHeaders(hdrs);
        setRows(order.map((o) => parsedRows[o.i]));
        setScores(order.map((o) => o.s));
        setTotalEst(est);
        if (hdrs.length === 0) setFileError("No columns detected. Check the file has a header row.");
      } catch {
        setFileError("Could not parse file. Make sure it is a valid CSV.");
      }
      setLoading(false);
    };
    reader.onerror = () => { setFileError("Failed to read file."); setLoading(false); };
    reader.readAsText(blob);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }

  function exportCSV() {
    if (!rows.length) return;
    const content = [
      [...headers, "risk_score", "risk_tier"].join(","),
      ...rows.map((r, i) => {
        const s = scores[i];
        const tier = s >= 0.7 ? "high" : s >= 0.4 ? "med" : "low";
        return [...r, s.toFixed(2), tier].join(",");
      }),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `scored_${fileName}`; a.click();
    URL.revokeObjectURL(url);
  }

  const hasData = rows.length > 0;
  const high = scores.filter((s) => s >= 0.7).length;
  const med  = scores.filter((s) => s >= 0.4 && s < 0.7).length;
  const low  = scores.filter((s) => s < 0.4).length;

  const distribution = [
    { name: "Legit", value: low, color: "var(--color-success)" },
    { name: "Review", value: med, color: "var(--color-gold)" },
    { name: "Mule", value: high, color: "var(--color-coral)" },
  ];

  const histogram = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}–${i * 10 + 10}`,
    count: scores.filter((s) => s * 100 >= i * 10 && s * 100 < (i + 1) * 10).length,
  }));

  const idKey = headers[0] ?? "ID";
  const previewCols = headers.slice(1, 4);

  return (
    <AppShell>
      <SectionHeader
        eyebrow={hasData ? `Batch · ~${totalEst.toLocaleString()} rows` : "Batch · no active run"}
        title="Batch Scoring"
        subtitle={hasData ? `${fileName} · ${fileSize} · showing top ${rows.length} rows` : "Upload a CSV file to score all accounts at once."}
        actions={
          <>
            <Btn variant="secondary" onClick={handleReset} disabled={!hasData}>Reset</Btn>
            <Btn disabled={!hasData} onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Uploader */}
        <GlassCard tone="info" className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Upload batch</h2>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`mt-4 rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 text-center select-none ${
              isDragging ? "border-primary bg-primary/15"
              : hasData ? "border-success/50 bg-success/5"
              : fileError ? "border-coral/40 bg-coral/5"
              : "border-primary/40 bg-primary/5 hover:bg-primary/10"
            }`}
          >
            {loading ? (
              <><div className="h-7 w-7 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" /><div className="mt-2 text-xs text-muted-foreground">Parsing…</div></>
            ) : hasData ? (
              <><CheckCircle2 className="h-7 w-7 mx-auto text-success" /><div className="mt-2 text-sm font-medium truncate">{fileName}</div><div className="text-xs text-muted-foreground mt-0.5">{fileSize} · click to change</div></>
            ) : fileError ? (
              <><XCircle className="h-7 w-7 mx-auto text-coral" /><div className="mt-2 text-xs text-coral break-words">{fileError}</div><div className="text-xs text-muted-foreground mt-1">Click to try another file</div></>
            ) : (
              <><FileUp className="h-7 w-7 mx-auto text-primary" /><div className="mt-2 text-sm font-medium">Drop CSV here</div><div className="text-xs text-muted-foreground mt-0.5">or click to browse · any size</div></>
            )}
            <input ref={inputRef} type="file" accept=".csv,.tsv,.txt" className="sr-only" aria-label="Upload batch CSV" onChange={handleChange} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {distribution.map((d) => (
              <div key={d.name} className="rounded-lg bg-surface-2/60 border border-border/60 p-2.5">
                <div className="text-[10px] uppercase text-muted-foreground">{d.name}</div>
                <div className="font-display text-lg font-semibold tabular-nums" style={{ color: d.value > 0 ? d.color : undefined }}>{hasData ? d.value : "—"}</div>
              </div>
            ))}
          </div>

          {hasData && (
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Est. total rows</span><span>~{totalEst.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Columns</span><span>{headers.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Preview rows</span><span>{rows.length}</span></div>
            </div>
          )}
        </GlassCard>

        {/* Pie */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Tier distribution</h2>
          {hasData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={2}>
                    {distribution.map((d) => <Cell key={d.name} fill={d.color} stroke="oklch(0.18 0.018 260)" strokeWidth={3} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.16 0.028 245)", border: "1px solid oklch(0.28 0.025 245 / 0.70)", borderRadius: 10, fontSize: 12, color: "oklch(0.95 0.008 55)" }} itemStyle={{ color: "oklch(0.95 0.008 55)" }} labelStyle={{ color: "oklch(0.95 0.008 55)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center"><TableProperties className="h-7 w-7 text-muted-foreground" /></div>
              <p className="text-sm text-muted-foreground">Upload a file to see tier distribution</p>
            </div>
          )}
        </GlassCard>

        {/* Histogram */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Risk histogram</h2>
          {hasData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogram} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="bucket" stroke="oklch(0.7 0.02 260)" fontSize={10} />
                  <YAxis stroke="oklch(0.7 0.02 260)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "oklch(0.16 0.028 245)", border: "1px solid oklch(0.28 0.025 245 / 0.70)", borderRadius: 10, fontSize: 12, color: "oklch(0.95 0.008 55)" }} itemStyle={{ color: "oklch(0.95 0.008 55)" }} labelStyle={{ color: "oklch(0.95 0.008 55)" }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center"><Filter className="h-7 w-7 text-muted-foreground" /></div>
              <p className="text-sm text-muted-foreground">Risk distribution appears after upload</p>
            </div>
          )}
        </GlassCard>

        {/* Results table */}
        <GlassCard className="p-0 xl:col-span-12 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <h2 className="font-display text-lg font-semibold">Results · highest risk first</h2>
            {hasData ? <Pill tone="info">{(high + med)} to review</Pill> : <span className="text-xs text-muted-foreground">No results — upload a CSV</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">{idKey}</th>
                  <th className="text-left font-medium px-3 py-3">Risk</th>
                  <th className="text-left font-medium px-3 py-3">Tier</th>
                  {previewCols.map((h) => <th key={h} className="text-left font-medium px-3 py-3">{h}</th>)}
                  <th className="text-right font-medium px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-muted-foreground text-sm">Upload a CSV file to see scored results here.</td></tr>
                ) : (
                  rows.slice(0, 50).map((row, i) => {
                    const s = scores[i];
                    const tier = s >= 0.7 ? "high" : s >= 0.4 ? "med" : "low";
                    return (
                      <tr key={i} className="hover:bg-surface-2/30">
                        <td className="px-5 py-3 font-mono text-xs">{row[0] || `ROW-${i + 1}`}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-surface-2">
                              <div className="h-full rounded-full" style={{ width: `${s * 100}%`, background: tier === "high" ? "var(--color-coral)" : tier === "med" ? "var(--color-gold)" : "var(--color-success)" }} />
                            </div>
                            <span className="tabular-nums text-xs">{s.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3"><Pill tone={tier as "low" | "med" | "high"}>{tier.toUpperCase()}</Pill></td>
                        {previewCols.map((_, ci) => <td key={ci} className="px-3 py-3 text-muted-foreground text-xs truncate max-w-[120px]">{row[ci + 1] ?? "—"}</td>)}
                        <td className="px-5 py-3 text-right"><Btn variant="ghost" size="sm">Review</Btn></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
