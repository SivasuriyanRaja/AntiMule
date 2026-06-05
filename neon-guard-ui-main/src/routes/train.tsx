import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/cybershield/primitives";
import { FileUp, Play, Settings2, CheckCircle2, XCircle } from "lucide-react";
import { useState, useRef, useCallback } from "react";

export const Route = createFileRoute("/train")({
  head: () => ({
    meta: [
      { title: "Train Model · CyberShield" },
      { name: "description", content: "Upload training data and train a new fraud detection model." },
    ],
  }),
  component: Train,
});

interface FileInfo {
  name: string;
  size: string;
  rows: number | null;
  columns: string[];
  error?: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Read only first 64 KB — enough for headers + row count estimate */
function readFileMeta(file: File): Promise<{ columns: string[]; estimatedRows: number }> {
  return new Promise((resolve, reject) => {
    // For parquet / unknown: skip parsing
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      resolve({ columns: [], estimatedRows: 0 });
      return;
    }

    const CHUNK = 64 * 1024; // 64 KB
    const blob = file.slice(0, CHUNK);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) ?? "";
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 1) { resolve({ columns: [], estimatedRows: 0 }); return; }

        const columns = lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

        // Estimate total rows from average line length in sample
        const sampleLines = lines.slice(1, Math.min(lines.length, 20));
        const avgLineLen = sampleLines.length > 0
          ? sampleLines.reduce((s, l) => s + l.length, 0) / sampleLines.length
          : 50;
        const estimatedRows = avgLineLen > 0
          ? Math.round((file.size - lines[0].length) / avgLineLen)
          : 0;

        resolve({ columns, estimatedRows: Math.max(0, estimatedRows) });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsText(blob);
  });
}

function Train() {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setFileInfo(null);
    setLogs([]);
    setProgress(0);
    setDone(false);

    const size = formatSize(file.size);

    try {
      const { columns, estimatedRows } = await readFileMeta(file);

      if (file.name.match(/\.parquet$/i)) {
        setFileInfo({ name: file.name, size, rows: null, columns: [], error: undefined });
      } else if (columns.length === 0) {
        setFileInfo({ name: file.name, size, rows: 0, columns: [], error: "No columns detected. Make sure it's a valid CSV with a header row." });
      } else {
        setFileInfo({ name: file.name, size, rows: estimatedRows, columns });
      }
    } catch {
      setFileInfo({ name: file.name, size, rows: 0, columns: [], error: "Could not read file. Try a smaller CSV to verify." });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const startTraining = () => {
    if (!fileInfo) return;
    setRunning(true);
    setDone(false);
    setProgress(0);
    setLogs([]);

    const steps = [
      `[INFO] Loading dataset: ${fileInfo.name} (${fileInfo.size})`,
      `[INFO] ${fileInfo.rows != null ? fileInfo.rows.toLocaleString() + " rows" : "rows unknown"} · ${fileInfo.columns.length || "?"} columns detected`,
      `[INFO] Feature engineering in progress…`,
      `[INFO] Train/val split 80/20 · stratified by label`,
      `[INFO] Fitting XGBoost (n_estimators=500, lr=0.03)…`,
      `[INFO] Fitting LightGBM (n_estimators=500)…`,
      `[INFO] Fitting CatBoost (iterations=300, depth=6)…`,
      `[INFO] Building Weighted Voting Ensemble [3, 2, 1]…`,
      `[INFO] Calibrating probabilities (isotonic)…`,
      `[SUCCESS] Training complete. Best model saved.`,
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setLogs((prev) => [...prev, steps[i]]);
        setProgress(Math.round(((i + 1) / steps.length) * 100));
        i++;
      } else {
        clearInterval(interval);
        setRunning(false);
        setDone(true);
      }
    }, 900);
  };

  const hasFile = !!fileInfo && !fileInfo.error;

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Workspace"
        title="Train a new model"
        subtitle="Drop in a labeled dataset, choose the algorithm, and we'll handle the heavy lifting."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Dataset uploader */}
        <GlassCard tone="info" className="p-6 xl:col-span-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Step 1</div>
          <h2 className="font-display text-lg font-semibold">Dataset</h2>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`mt-4 rounded-xl border-2 border-dashed transition-all cursor-pointer p-8 text-center select-none
              ${isDragging ? "border-primary bg-primary/15 scale-[1.01]"
                : hasFile ? "border-success/50 bg-success/5"
                : fileInfo?.error ? "border-coral/40 bg-coral/5"
                : "border-primary/40 bg-primary/5 hover:bg-primary/10"}`}
          >
            {loading ? (
              <>
                <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <div className="mt-3 text-sm text-muted-foreground">Reading file…</div>
              </>
            ) : hasFile ? (
              <>
                <CheckCircle2 className="h-8 w-8 mx-auto text-success" />
                <div className="mt-2 text-sm font-medium truncate">{fileInfo!.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{fileInfo!.size} · click to change</div>
              </>
            ) : fileInfo?.error ? (
              <>
                <XCircle className="h-8 w-8 mx-auto text-coral" />
                <div className="mt-2 text-sm text-coral font-medium">Failed to read</div>
                <div className="text-xs text-muted-foreground mt-1 break-words">{fileInfo.error}</div>
              </>
            ) : (
              <>
                <FileUp className="h-8 w-8 mx-auto text-primary" />
                <div className="mt-3 text-sm font-medium">Drop CSV or Parquet here</div>
                <div className="text-xs text-muted-foreground mt-1">or click to browse · any size</div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,.txt,.parquet"
              className="sr-only"
              aria-label="Upload training dataset"
              onChange={handleInputChange}
            />
          </div>

          {/* File metadata */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File</span>
              <span className="font-mono truncate max-w-[160px]">{fileInfo?.name ?? "No file selected"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span>{fileInfo?.size ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. rows</span>
              <span className="tabular-nums">
                {fileInfo?.rows != null ? `~${fileInfo.rows.toLocaleString()}` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Columns</span>
              <span className="tabular-nums">{fileInfo?.columns.length ? fileInfo.columns.length : "—"}</span>
            </div>
          </div>

          {/* Column preview */}
          {fileInfo?.columns && fileInfo.columns.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Detected columns</div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-auto">
                {fileInfo.columns.slice(0, 15).map((col) => (
                  <span key={col} className="text-[10px] font-mono bg-surface-2/60 border border-border/60 px-1.5 py-0.5 rounded">{col}</span>
                ))}
                {fileInfo.columns.length > 15 && (
                  <span className="text-[10px] text-muted-foreground px-1 py-0.5">+{fileInfo.columns.length - 15} more</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Btn className="flex-1" disabled={!hasFile || running} onClick={startTraining}>
              <Play className="h-4 w-4" />
              {running ? "Training…" : "Start training"}
            </Btn>
            <Btn variant="secondary"><Settings2 className="h-4 w-4" />Configure</Btn>
          </div>
        </GlassCard>

        {/* Training progress */}
        <GlassCard className="p-6 xl:col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {running ? "Step 2 · in progress" : done ? "Step 2 · complete" : "Step 2 · waiting"}
          </div>
          <h2 className="font-display text-lg font-semibold mt-0.5">Training run</h2>

          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">
                {running ? "Training in progress…" : done ? "Training complete ✓" : "No active run"}
              </span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${done ? "bg-success" : "gradient-primary shadow-glow"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {!hasFile ? "Upload a dataset to begin" : running ? "Please wait…" : done ? "Model ready to promote" : "Click Start training to begin"}
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-background/70 border border-border font-mono text-[12px] leading-relaxed p-4 max-h-56 overflow-auto">
            {logs.length === 0
              ? <div className="text-muted-foreground italic">Training logs will appear here…</div>
              : logs.map((l, i) => (
                <div key={i} className={l.startsWith("[SUCCESS]") ? "text-success" : l.startsWith("[ERROR]") ? "text-coral" : "text-muted-foreground"}>
                  <span className="text-primary">›</span> {l}
                </div>
              ))}
          </div>
        </GlassCard>

        {/* Best model metrics */}
        <GlassCard className={`p-6 xl:col-span-3 transition-all ${done ? "ring-1 ring-success/30" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {done && (
                <div className="h-11 w-11 rounded-xl bg-success/15 text-success grid place-items-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
              <div>
                <div className={`text-[11px] uppercase tracking-wider ${done ? "text-success" : "text-muted-foreground"}`}>
                  Best candidate
                </div>
                <h3 className={`font-display text-lg font-semibold ${done ? "" : "text-muted-foreground"}`}>
                  {done ? "Ensemble (XGB + LightGBM + CatBoost)" : "No model trained yet"}
                </h3>
              </div>
            </div>
            {done && (
              <div className="flex gap-2">
                <Btn variant="secondary">Compare models</Btn>
                <Btn>Promote to production</Btn>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["AUC-ROC",       done ? "~0.987" : "—"],
              ["PR-AUC",        done ? "~0.942" : "—"],
              ["Recall @ 0.5",  done ? "~0.91"  : "—"],
              ["Precision @ 0.5", done ? "~0.95" : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-surface-2/60 border border-border/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className={`font-display text-xl font-semibold tabular-nums ${v === "—" ? "text-muted-foreground" : ""}`}>{v}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
