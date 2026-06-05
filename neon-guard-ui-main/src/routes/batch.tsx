import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, Pill, SectionHeader } from "@/components/cybershield/primitives";
import { Download, FileUp, Filter, TableProperties, CheckCircle2, XCircle } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import {
  Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
  Bar, BarChart, XAxis, YAxis, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "Batch Scoring · CyberShield" },
      { name: "description", content: "Score thousands of accounts at once and triage the riskiest." },
    ],
  }),
  component: Batch,
});

type Tier = "high" | "med" | "low";
interface ScoredRow { [key: string]: string | number; _risk: number; _tier: Tier }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Simple deterministic hash → 0.0–1.0 risk score */
function scoreRow(row: Record<string, string>, idx: number): number {
  let h = idx * 31 + 17;
  for (const v of Object.values(row)) {
    for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0;
  }
  return (h % 100) / 100; // 0.00 – 0.99
}

function tierOf(risk: number): Tier {
  return risk >= 0.7 ? "high" : risk >= 0.4 ? "med" : "low";
}

/** Read first 256 KB to get headers + sample rows */
function readCSVSample(file: File): Promise<{ headers: string[]; rows: ScoredRow[]; totalEstimate: number }> {
  return new Promise((resolve, reject) => {
    const CHUNK = 256 * 1024;
    const blob = file.slice(0, CHUNK);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) ?? "";
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { resolve({ headers: [], rows: [], totalEstimate: 0 }); return; }

        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

        // Parse sample rows (up to 200)
        const sampleLines = lines.slice(1, 201);
        const avgLen = sampleLines.reduce((s, l) => s + l.length + 1, 0) / (sampleLines.length || 1);
        const totalEstimate = avgLen > 0 ? Math.round((file.size - lines[0].length) / avgLen) : 0;

        const rows: ScoredRow[] = sampleLines.map((line, i) => {
          const vals = line.split(",");
          const row: Record<string, string> = {};
          headers.forEach((h, j) => { row[h] = (vals[j] ?? "").trim().replace(/^"|"$/g, ""); });
          const risk = scoreRow(row, i);
          return { ...row, _risk: risk, _tier: tierOf(risk) };
        });

        resolve({ headers, rows, totalEstimate });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsText(blob);
  });
}

function Batch() {
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; totalEstimate: number; headers: string[] } | null>(null);
  const [rows, setRows] = useState<ScoredRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setFileInfo(null);
    setRows([]);

    if (file.name.match(/\.parquet$/i)) {
      setFileInfo({ name: file.name, size: formatSize(file.size), totalEstimate: 0, headers: [] });
      setError("Parquet preview not supported in-browser. File accepted — pass it to the Python backend.");
      setLoading(false);
      return;
    }

    try {
      const { headers, rows: parsedRows, totalEstimate } = await readCSVSample(file);
      if (headers.length === 0) {
        setError("No columns detected. Make sure the file is a valid CSV with a header row.");
      } else {
        setFileInfo({ name: file.name, size: formatSize(file.size), totalEstimate, headers });
        setRows(parsedRows.sort((a, b) => b._risk - a._risk));
      }
    } catch {
      setError("Could not parse file. Make sure it is a valid CSV.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const high = rows.filter((r) => r._tier === "high").length;
  const med  = rows.filter((r) => r._tier === "med").length;
  const low  = rows.filter((r) => r._tier === "low").length;

  const distribution = [
    { name: "Legit",  value: low,  color: "var(--color-success)" },
    { name: "Review", value: med,  color: "var(--color-gold)" },
    { name: "Mule",   value: high, color: "var(--color-coral)" },
  ];

  const histogram = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}–${i * 10 + 10}`,
    count: rows.filter((r) => r._risk * 100 >= i * 10 && r._risk * 100 < (i + 1) * 10).length,
  }));

  const hasData = rows.length > 0;
  const idKey = fileInfo?.headers?.[0] ?? "ID";

  const exportCSV = () => {
    if (!hasData || !fileInfo) return;
    const headers = [...fileInfo.headers, "risk_score", "risk_tier"];
    const content = [
      headers.join(","),
      ...rows.map((r) =>
        [...fileInfo.headers.map((h) => String(r[h] ?? "")), r._risk.toFixed(2), r._tier].join(",")
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `scored_${fileInfo.name}`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <SectionHeader
        eyebrow={fileInfo ? `Batch · ~${fileInfo.totalEstimate.toLocaleString()} rows` : "Batch · no active run"}
        title="Batch Scoring"
        subtitle={
          fileInfo
            ? `${fileInfo.name} · ${fileInfo.size} · showing top ${rows.length} scored rows`
            : "Upload a CSV file to score all accounts at once."
        }
        actions={
          <>
            <Btn variant="secondary" disabled={!hasData}><Filter className="h-4 w-4" />Filters</Btn>
            <Btn disabled={!hasData} onClick={exportCSV}><Download className="h-4 w-4" />Export CSV</Btn>
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
            className={`mt-4 rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 text-center select-none
              ${isDragging ? "border-primary bg-primary/15 scale-[1.01]"
                : hasData ? "border-success/50 bg-success/5"
                : error ? "border-coral/40 bg-coral/5"
                : "border-primary/40 bg-primary/5 hover:bg-primary/10"}`}
          >
            {loading ? (
              <><div className="h-7 w-7 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" /><div className="mt-2 text-xs text-muted-foreground">Parsing file…</div></>
            ) : hasData ? (
              <><CheckCircle2 className="h-7 w-7 mx-auto text-success" /><div className="mt-2 text-sm font-medium truncate">{fileInfo!.name}</div><div className="text-xs text-muted-foreground mt-0.5">{fileInfo!.size} · click to change</div></>
            ) : error ? (
              <><XCircle className="h-7 w-7 mx-auto text-coral" /><div className="mt-2 text-xs text-coral break-words">{error}</div><div className="text-xs text-muted-foreground mt-1">Click to try another file</div></>
            ) : (
              <><FileUp className="h-7 w-7 mx-auto text-primary" /><div className="mt-2 text-sm font-medium">Drop CSV here</div><div className="text-xs text-muted-foreground mt-0.5">or click to browse · any size</div></>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="sr-only"
              aria-label="Upload batch CSV file"
              onChange={handleInputChange}
            />
          </div>

          {/* Counts */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {distribution.map((d) => (
              <div key={d.name} className="rounded-lg bg-surface-2/60 border border-border/60 p-2.5">
                <div className="text-[10px] uppercase text-muted-foreground">{d.name}</div>
                <div className="font-display text-lg font-semibold tabular-nums" style={{ color: d.value > 0 ? d.color : undefined }}>
                  {hasData ? d.value : "—"}
                </div>
              </div>
            ))}
          </div>

          {fileInfo && (
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Est. total rows</span><span>~{fileInfo.totalEstimate.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Columns</span><span>{fileInfo.headers.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Preview rows</span><span>{rows.length}</span></div>
            </div>
          )}
        </GlassCard>

        {/* Pie chart */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Tier distribution</h2>
          {hasData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={2}>
                    {distribution.map((d) => (
                      <Cell key={d.name} fill={d.color} stroke="oklch(0.18 0.018 260)" strokeWidth={3} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 10, fontSize: 12 }} />
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
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 10, fontSize: 12 }} />
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
            {hasData
              ? <Pill tone="info">{(high + med).toLocaleString()} to review</Pill>
              : <span className="text-xs text-muted-foreground">No results — upload a CSV file</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">{idKey}</th>
                  <th className="text-left font-medium px-3 py-3">Risk</th>
                  <th className="text-left font-medium px-3 py-3">Tier</th>
                  {fileInfo?.headers.slice(1, 4).map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-3 truncate max-w-[100px]">{h}</th>
                  ))}
                  <th className="text-right font-medium px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-muted-foreground text-sm">
                      Upload a CSV file to see scored results here.
                    </td>
                  </tr>
                ) : (
                  rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="hover:bg-surface-2/30">
                      <td className="px-5 py-3 font-mono text-xs">{String(r[idKey] ?? `ROW-${i + 1}`)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${r._risk * 100}%`,
                                background: r._tier === "high" ? "var(--color-coral)" : r._tier === "med" ? "var(--color-gold)" : "var(--color-success)",
                              }}
                            />
                          </div>
                          <span className="tabular-nums text-xs">{r._risk.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={r._tier}>{r._tier.toUpperCase()}</Pill>
                      </td>
                      {fileInfo?.headers.slice(1, 4).map((h) => (
                        <td key={h} className="px-3 py-3 text-muted-foreground text-xs truncate max-w-[120px]">
                          {String(r[h] ?? "—")}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-right">
                        <Btn variant="ghost" size="sm">Review</Btn>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
