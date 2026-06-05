import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, Pill, SectionHeader } from "@/components/cybershield/primitives";
import { Download, FileUp, Filter, TableProperties, CheckCircle2, XCircle } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "Batch Scoring · CyberShield" },
      { name: "description", content: "Score thousands of accounts at once and triage the riskiest." },
    ],
  }),
  component: Batch,
});

interface ParsedRow { [key: string]: string }

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim().replace(/^"|"$/g, ""); });
    return row;
  });
  return { headers, rows };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Simulated risk scoring for preview purposes
function assignRisk(row: ParsedRow, index: number): { risk: number; tier: "high" | "med" | "low" } {
  // Use hash of row values for deterministic fake score
  const hash = Object.values(row).join("").split("").reduce((a, c) => a + c.charCodeAt(0), index * 7);
  const risk = Math.round(((hash % 97) + 3) / 100 * 100) / 100;
  const tier = risk >= 0.7 ? "high" : risk >= 0.4 ? "med" : "low";
  return { risk, tier };
}

function Batch() {
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; rows: number; headers: string[] } | null>(null);
  const [tableRows, setTableRows] = useState<(ParsedRow & { _risk: number; _tier: "high" | "med" | "low" })[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setFileInfo(null);
    setTableRows([]);

    if (file.name.endsWith(".parquet")) {
      setFileInfo({ name: file.name, size: formatBytes(file.size), rows: 0, headers: [] });
      setError("Parquet preview not supported in-browser. File accepted for backend processing.");
      setLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) ?? "";
        const { headers, rows } = parseCSV(text);
        const scoredRows = rows.slice(0, 200).map((row, i) => ({ ...row, ...assignRisk(row, i), _risk: assignRisk(row, i).risk, _tier: assignRisk(row, i).tier }));
        setFileInfo({ name: file.name, size: formatBytes(file.size), rows: rows.length, headers });
        setTableRows(scoredRows.sort((a, b) => b._risk - a._risk));
      } catch {
        setError("Could not parse CSV. Make sure the file has a valid header row.");
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setError("Failed to read file."); setLoading(false); };
    reader.readAsText(file.size > 5 * 1024 * 1024 ? file.slice(0, 5 * 1024 * 1024) : file);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Compute distribution from scored rows
  const highCount = tableRows.filter((r) => r._tier === "high").length;
  const medCount = tableRows.filter((r) => r._tier === "med").length;
  const lowCount = tableRows.filter((r) => r._tier === "low").length;
  const total = tableRows.length;

  const distribution = [
    { name: "Legit", value: lowCount, color: "var(--color-success)" },
    { name: "Review", value: medCount, color: "var(--color-gold)" },
    { name: "Mule", value: highCount, color: "var(--color-coral)" },
  ];

  const histogram = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}–${i * 10 + 10}`,
    count: tableRows.filter((r) => r._risk * 100 >= i * 10 && r._risk * 100 < (i + 1) * 10).length,
  }));

  const idKey = fileInfo?.headers?.[0] ?? "ID";

  const exportCSV = () => {
    if (!tableRows.length) return;
    const headers = [...(fileInfo?.headers ?? []), "risk_score", "risk_tier"];
    const csvContent = [
      headers.join(","),
      ...tableRows.map((r) => [...(fileInfo?.headers ?? []).map((h) => r[h] ?? ""), r._risk.toFixed(2), r._tier].join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `scored_${fileInfo?.name ?? "results"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <SectionHeader
        eyebrow={fileInfo ? `Batch · ${fileInfo.rows.toLocaleString()} rows` : "Batch · no active run"}
        title="Batch Scoring"
        subtitle={fileInfo ? `${fileInfo.name} · ${fileInfo.size} · showing top ${Math.min(200, tableRows.length)} results` : "Upload a CSV or Parquet file of accounts to score them all at once."}
        actions={
          <>
            <Btn variant="secondary" disabled={!fileInfo}><Filter className="h-4 w-4" />Filters</Btn>
            <Btn disabled={tableRows.length === 0} onClick={exportCSV}><Download className="h-4 w-4" />Export CSV</Btn>
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
            className={`mt-4 block rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 text-center select-none ${
              isDragging ? "border-primary bg-primary/15 scale-[1.01]"
              : fileInfo && !error ? "border-success/50 bg-success/5"
              : "border-primary/40 bg-primary/5 hover:bg-primary/10"
            }`}
          >
            {loading ? (
              <><div className="h-7 w-7 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" /><div className="mt-2 text-xs text-muted-foreground">Parsing file…</div></>
            ) : fileInfo && !error ? (
              <><CheckCircle2 className="h-7 w-7 mx-auto text-success" /><div className="mt-2 text-sm font-medium truncate">{fileInfo.name}</div><div className="text-xs text-muted-foreground mt-0.5">{fileInfo.size} · click to change</div></>
            ) : error ? (
              <><XCircle className="h-7 w-7 mx-auto text-coral" /><div className="mt-2 text-xs text-coral">{error}</div></>
            ) : (
              <><FileUp className="h-7 w-7 mx-auto text-primary" /><div className="mt-2 text-sm font-medium">Drop CSV or Parquet</div><div className="text-xs text-muted-foreground mt-0.5">or click to browse · up to 5 GB</div></>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.parquet"
              className="sr-only"
              aria-label="Upload batch file"
              onChange={handleInputChange}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {distribution.map((d) => (
              <div key={d.name} className="rounded-lg bg-surface-2/60 border border-border/60 p-2.5">
                <div className="text-[10px] uppercase text-muted-foreground">{d.name}</div>
                <div className="font-display text-lg font-semibold tabular-nums" style={{ color: d.value > 0 ? d.color : undefined }}>
                  {total > 0 ? d.value.toLocaleString() : "—"}
                </div>
              </div>
            ))}
          </div>

          {fileInfo && (
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total rows</span><span className="tabular-nums">{fileInfo.rows.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Columns</span><span className="tabular-nums">{fileInfo.headers.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Preview rows</span><span className="tabular-nums">{Math.min(200, tableRows.length)}</span></div>
            </div>
          )}
        </GlassCard>

        {/* Tier distribution pie */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Tier distribution</h2>
          {total > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={2}>
                    {distribution.map((d) => <Cell key={d.name} fill={d.color} stroke="oklch(0.18 0.018 260)" strokeWidth={3} />)}
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

        {/* Risk histogram */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Risk histogram</h2>
          {total > 0 ? (
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
              <p className="text-sm text-muted-foreground">Risk distribution will appear after upload</p>
            </div>
          )}
        </GlassCard>

        {/* Results table */}
        <GlassCard className="p-0 xl:col-span-12 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <h2 className="font-display text-lg font-semibold">Results · highest risk first</h2>
            {total > 0 ? <Pill tone="info">{highCount + medCount} to review</Pill> : <span className="text-xs text-muted-foreground">No results to display</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">{idKey}</th>
                  <th className="text-left font-medium px-3 py-3">Risk Score</th>
                  <th className="text-left font-medium px-3 py-3">Tier</th>
                  {fileInfo?.headers?.slice(1, 4).map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-3">{h}</th>
                  ))}
                  <th className="text-right font-medium px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-muted-foreground text-sm">
                      Upload a CSV file to see scored results here.
                    </td>
                  </tr>
                ) : (
                  tableRows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="hover:bg-surface-2/30">
                      <td className="px-5 py-3 font-mono text-xs">{r[idKey] || `ROW-${i + 1}`}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full"
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
                        <Pill tone={r._tier as "low" | "med" | "high"}>{r._tier.toUpperCase()}</Pill>
                      </td>
                      {fileInfo?.headers?.slice(1, 4).map((h) => (
                        <td key={h} className="px-3 py-3 text-muted-foreground text-xs truncate max-w-[120px]">{r[h] ?? "—"}</td>
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
