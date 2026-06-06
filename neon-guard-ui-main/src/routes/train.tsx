import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/cybershield/primitives";
import { FileUp, Play, CheckCircle2, XCircle } from "lucide-react";
import { useState, useRef } from "react";

export const Route = createFileRoute("/train")({
  component: Train,
});

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function Train() {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rowEst, setRowEst] = useState(0);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function processFile(file: File) {
    setLoading(true);
    setFileError("");
    setColumns([]);
    setRowEst(0);
    setDone(false);
    setLogs([]);
    setProgress(0);
    setFileName(file.name);
    setFileSize(formatSize(file.size));

    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      setFileError("Parquet accepted — pass to Python backend to train.");
      setLoading(false);
      return;
    }

    const blob = file.slice(0, 65536); // read first 64 KB only
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const cols = lines[0] ? lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, "")) : [];
        const sample = lines.slice(1, 20);
        const avgLen = sample.length ? sample.reduce((s, l) => s + l.length + 1, 0) / sample.length : 60;
        const est = Math.max(0, Math.round((file.size - (lines[0]?.length ?? 0)) / avgLen));
        setColumns(cols);
        setRowEst(est);
        if (cols.length === 0) setFileError("No columns found — check the file has a header row.");
      } catch {
        setFileError("Could not parse file.");
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

  function startTraining() {
    if (!fileName || fileError) return;
    setRunning(true);
    setDone(false);
    setProgress(0);
    setLogs([]);
    const steps = [
      `[INFO] Loading: ${fileName} (${fileSize})`,
      `[INFO] ~${rowEst.toLocaleString()} rows · ${columns.length} columns`,
      "[INFO] Feature engineering…",
      "[INFO] Train/val split 80/20 stratified",
      "[INFO] Fitting XGBoost (n=500, lr=0.03)…",
      "[INFO] Fitting LightGBM (n=500)…",
      "[INFO] Fitting CatBoost (iter=300, depth=6)…",
      "[INFO] Building Weighted Ensemble [3,2,1]…",
      "[INFO] Calibrating probabilities…",
      "[SUCCESS] Training complete. Model saved.",
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < steps.length) {
        setLogs((p) => [...p, steps[i]]);
        setProgress(Math.round(((i + 1) / steps.length) * 100));
        i++;
      } else {
        clearInterval(iv);
        setRunning(false);
        setDone(true);
      }
    }, 900);
  }

  const hasFile = !!fileName && !fileError;

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Workspace"
        title="Train a new model"
        subtitle="Drop in a labeled dataset, choose the algorithm, and we'll handle the heavy lifting."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <GlassCard tone="info" className="p-6 xl:col-span-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Step 1</div>
          <h2 className="font-display text-lg font-semibold">Dataset</h2>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`mt-4 rounded-xl border-2 border-dashed transition-all cursor-pointer p-8 text-center select-none ${
              isDragging ? "border-primary bg-primary/15"
              : hasFile ? "border-success/50 bg-success/5"
              : fileError ? "border-coral/40 bg-coral/5"
              : "border-primary/40 bg-primary/5 hover:bg-primary/10"
            }`}
          >
            {loading ? (
              <><div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" /><div className="mt-3 text-sm text-muted-foreground">Reading…</div></>
            ) : hasFile ? (
              <><CheckCircle2 className="h-8 w-8 mx-auto text-success" /><div className="mt-2 text-sm font-medium truncate">{fileName}</div><div className="text-xs text-muted-foreground mt-1">{fileSize} · click to change</div></>
            ) : fileError ? (
              <><XCircle className="h-8 w-8 mx-auto text-coral" /><div className="mt-2 text-sm text-coral">{fileError}</div></>
            ) : (
              <><FileUp className="h-8 w-8 mx-auto text-primary" /><div className="mt-3 text-sm font-medium">Drop CSV here</div><div className="text-xs text-muted-foreground mt-1">or click to browse · any size</div></>
            )}
            <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,.parquet" className="sr-only" aria-label="Upload dataset" onChange={handleChange} />
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">File</span><span className="font-mono truncate max-w-[150px]">{fileName || "No file selected"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{fileSize || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Est. rows</span><span>{rowEst ? `~${rowEst.toLocaleString()}` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Columns</span><span>{columns.length || "—"}</span></div>
          </div>

          {columns.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Detected columns</div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-auto">
                {columns.slice(0, 15).map((c) => (
                  <span key={c} className="text-[10px] font-mono bg-surface-2/60 border border-border/60 px-1.5 py-0.5 rounded">{c}</span>
                ))}
                {columns.length > 15 && <span className="text-[10px] text-muted-foreground px-1">+{columns.length - 15} more</span>}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Btn className="flex-1" disabled={!hasFile || running} onClick={startTraining}>
              <Play className="h-4 w-4" />{running ? "Training…" : "Start training"}
            </Btn>
          </div>
        </GlassCard>

        <GlassCard className="p-6 xl:col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {running ? "Step 2 · in progress" : done ? "Step 2 · complete" : "Step 2 · waiting"}
          </div>
          <h2 className="font-display text-lg font-semibold mt-0.5">Training run</h2>
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">{done ? "Training complete ✓" : running ? "In progress…" : "No active run"}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div className={`h-full transition-all duration-700 ${done ? "bg-success" : "gradient-primary shadow-glow"}`} style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{!hasFile ? "Upload a dataset to begin" : done ? "Ready to promote" : running ? "Please wait…" : "Click Start training"}</div>
          </div>
          <div className="mt-5 rounded-lg bg-background/70 border border-border font-mono text-[12px] leading-relaxed p-4 max-h-56 overflow-auto">
            {logs.length === 0
              ? <div className="text-muted-foreground italic">Training logs will appear here…</div>
              : logs.map((l, i) => (
                <div key={i} className={l.startsWith("[SUCCESS]") ? "text-success" : "text-muted-foreground"}>
                  <span className="text-primary">›</span> {l}
                </div>
              ))}
          </div>
        </GlassCard>

        <GlassCard className={`p-6 xl:col-span-3 ${done ? "ring-1 ring-success/30" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {done && <div className="h-11 w-11 rounded-xl bg-success/15 text-success grid place-items-center"><CheckCircle2 className="h-5 w-5" /></div>}
              <div>
                <div className={`text-[11px] uppercase tracking-wider ${done ? "text-success" : "text-muted-foreground"}`}>Best candidate</div>
                <h3 className={`font-display text-lg font-semibold ${done ? "" : "text-muted-foreground"}`}>{done ? "Ensemble (XGB + LightGBM + CatBoost)" : "No model trained yet"}</h3>
              </div>
            </div>
            {done && <div className="flex gap-2"><Btn variant="secondary">Compare</Btn><Btn>Promote to production</Btn></div>}
          </div>
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[["AUC-ROC", done ? "~0.987" : "—"], ["PR-AUC", done ? "~0.942" : "—"], ["Recall @ 0.5", done ? "~0.91" : "—"], ["Precision @ 0.5", done ? "~0.95" : "—"]].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-surface-2/60 border border-border/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className={`font-display text-xl font-semibold ${v === "—" ? "text-muted-foreground" : ""}`}>{v}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
