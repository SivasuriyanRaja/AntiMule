import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/antimule/primitives";
import { FileUp, Play, CheckCircle2, XCircle, AlertCircle, Cpu, Loader2 } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";

export const Route = createFileRoute("/train")({
  component: Train,
});

const API_BASE = "http://localhost:8005";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

interface TrainMetrics {
  best_model: string;
  auc: string;
  avg_precision: string;
  recall: string;
  precision: string;
}

function Train() {
  const [file, setFile]               = useState<File | null>(null);
  const [fileName, setFileName]       = useState(() => localStorage.getItem("train_fileName") || "");
  const [fileSize, setFileSize]       = useState(() => localStorage.getItem("train_fileSize") || "");
  const [columns, setColumns]         = useState<string[]>(() => { const s = localStorage.getItem("train_columns"); return s ? JSON.parse(s) : []; });
  const [rowEst, setRowEst]           = useState(() => { const s = localStorage.getItem("train_rowEst"); return s ? JSON.parse(s) : 0; });
  const [fileError, setFileError]     = useState("");
  const [isDragging, setIsDragging]   = useState(false);
  const [parsing, setParsing]         = useState(false);

  const [logs, setLogs]               = useState<string[]>(() => { const s = localStorage.getItem("train_logs"); return s ? JSON.parse(s) : []; });
  const [progress, setProgress]       = useState(() => { const s = localStorage.getItem("train_progress"); return s ? JSON.parse(s) : 0; });
  const [running, setRunning]         = useState(false);
  const [done, setDone]               = useState(() => { const s = localStorage.getItem("train_done"); return s ? JSON.parse(s) : false; });
  const [trainError, setTrainError]   = useState("");
  const [metrics, setMetrics]         = useState<TrainMetrics | null>(() => { const s = localStorage.getItem("train_metrics"); return s ? JSON.parse(s) : null; });
  const [backendOk, setBackendOk]     = useState<boolean | null>(null);

  React.useEffect(() => {
    localStorage.setItem("train_fileName", fileName);
    localStorage.setItem("train_fileSize", fileSize);
    localStorage.setItem("train_columns", JSON.stringify(columns));
    localStorage.setItem("train_rowEst", JSON.stringify(rowEst));
    localStorage.setItem("train_logs", JSON.stringify(logs));
    localStorage.setItem("train_progress", JSON.stringify(progress));
    localStorage.setItem("train_done", JSON.stringify(done));
    if (metrics) localStorage.setItem("train_metrics", JSON.stringify(metrics));
    else localStorage.removeItem("train_metrics");
  }, [fileName, fileSize, columns, rowEst, logs, progress, done, metrics]);

  function handleReset() {
    setFileName(""); setFileSize(""); setColumns([]); setRowEst(0); setLogs([]); setProgress(0); setDone(false); setMetrics(null);
    localStorage.removeItem("train_fileName"); localStorage.removeItem("train_fileSize"); localStorage.removeItem("train_columns");
    localStorage.removeItem("train_rowEst"); localStorage.removeItem("train_logs"); localStorage.removeItem("train_progress");
    localStorage.removeItem("train_done"); localStorage.removeItem("train_metrics");
  }

  const inputRef  = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Check backend health on mount ──────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => setBackendOk(r.ok))
      .catch(() => setBackendOk(false));
  }, []);

  // ── Auto-scroll logs ────────────────────────────────────────────────────────
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // ── File processing ─────────────────────────────────────────────────────────
  function processFile(f: File) {
    setParsing(true);
    setFileError("");
    setColumns([]);
    setRowEst(0);
    setDone(false);
    setLogs([]);
    setProgress(0);
    setMetrics(null);
    setTrainError("");
    setFileName(f.name);
    setFileSize(formatSize(f.size));
    setFile(f);

    if (!f.name.match(/\.(csv|tsv|txt)$/i)) {
      setFileError("Only CSV/TSV files are supported for browser upload.");
      setParsing(false);
      return;
    }

    const blob = f.slice(0, 65536);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const cols  = lines[0]
          ? lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
          : [];
        const sample = lines.slice(1, 20);
        const avgLen = sample.length
          ? sample.reduce((s, l) => s + l.length + 1, 0) / sample.length
          : 60;
        const est = Math.max(0, Math.round((f.size - (lines[0]?.length ?? 0)) / avgLen));
        setColumns(cols);
        setRowEst(est);
        if (cols.length === 0)
          setFileError("No columns found — check the file has a header row.");
      } catch {
        setFileError("Could not parse file headers.");
      }
      setParsing(false);
    };
    reader.onerror = () => {
      setFileError("Failed to read file.");
      setParsing(false);
    };
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

  // ── Training via real backend SSE ───────────────────────────────────────────
  async function startTraining() {
    if (!file || fileError || running) return;

    setRunning(true);
    setDone(false);
    setTrainError("");
    setLogs([`[INFO] Uploading ${fileName} (${fileSize}) to backend…`]);
    setProgress(2);
    setMetrics(null);

    // Estimate progress from known pipeline step keywords
    const STEP_KEYWORDS: [string, number][] = [
      ["STEP 1",  10], ["STEP 2",  20], ["STEP 3",  30],
      ["STEP 4",  40], ["STEP 5",  50], ["STEP 6",  60],
      ["STEP 7",  70], ["STEP 8",  85], ["STEP 9",  95],
      ["RESULT",  98], ["DONE",   100],
    ];

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/train`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Backend error ${response.status}: ${text}`);
      }

      const reader  = response.body!.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          try {
            const msg = JSON.parse(line) as { log: string; done?: boolean };

            setLogs((prev) => [...prev, msg.log]);

            // Update progress from step keywords
            for (const [kw, pct] of STEP_KEYWORDS) {
              if (msg.log.includes(kw)) {
                setProgress(pct);
                break;
              }
            }

            // Parse metrics from [RESULT] line
            if (msg.log.startsWith("[RESULT]")) {
              const m: Record<string, string> = {};
              for (const pair of msg.log.replace("[RESULT] ", "").split(" ")) {
                const [k, v] = pair.split("=");
                if (k && v) m[k] = v;
              }
              setMetrics({
                best_model:    m.best_model    ?? "—",
                auc:           m.auc           ?? "—",
                avg_precision: m.avg_precision ?? "—",
                recall:        m.recall        ?? "—",
                precision:     m.precision     ?? "—",
              });
            }

            if (msg.log.includes("[ERROR]")) {
              setTrainError(msg.log.replace("[ERROR]", "").trim());
            }

            if (msg.done) {
              setProgress(100);
              setRunning(false);
              setDone(true);
              return;
            }
          } catch {
            // malformed SSE chunk — skip
          }
        }
      }
    } catch (err: any) {
      setTrainError(err.message ?? "Unknown error");
      setLogs((prev) => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setRunning(false);
    }
  }

  const hasFile = !!fileName && !fileError;

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Workspace"
        title="Train a new model"
        subtitle="Upload your labeled dataset — the backend will train XGBoost, LightGBM and CatBoost and pick the best ensemble automatically."
      />

      {/* Backend status banner */}
      {backendOk === false && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-coral/40 bg-coral/5 px-4 py-3 text-sm text-coral">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Backend offline</strong> — make sure the Python server is running on{" "}
            <code className="font-mono text-xs">localhost:8005</code>. Run{" "}
            <code className="font-mono text-xs">npm run dev</code> from the project root.
          </span>
        </div>
      )}
      {backendOk === true && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-2.5 text-xs text-success">
          <Cpu className="h-3.5 w-3.5" />
          Backend connected · <code className="font-mono">localhost:8005</code>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ── Step 1: Dataset upload ─────────────────────────────────────── */}
        <GlassCard tone="info" className="p-6 xl:col-span-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Step 1</div>
          <h2 className="font-display text-lg font-semibold">Dataset</h2>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`mt-4 rounded-xl border-2 border-dashed transition-all cursor-pointer p-8 text-center select-none ${
              isDragging   ? "border-primary bg-primary/15"
              : hasFile    ? "border-success/50 bg-success/5"
              : fileError  ? "border-coral/40 bg-coral/5"
              : "border-primary/40 bg-primary/5 hover:bg-primary/10"
            }`}
          >
            {parsing ? (
              <><div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" /><div className="mt-3 text-sm text-muted-foreground">Reading headers…</div></>
            ) : hasFile ? (
              <><CheckCircle2 className="h-8 w-8 mx-auto text-success" /><div className="mt-2 text-sm font-medium truncate">{fileName}</div><div className="text-xs text-muted-foreground mt-1">{fileSize} · click to change</div></>
            ) : fileError ? (
              <><XCircle className="h-8 w-8 mx-auto text-coral" /><div className="mt-2 text-sm text-coral">{fileError}</div></>
            ) : (
              <><FileUp className="h-8 w-8 mx-auto text-primary" /><div className="mt-3 text-sm font-medium">Drop CSV here</div><div className="text-xs text-muted-foreground mt-1">or click to browse · any size</div></>
            )}
            <input
              ref={inputRef} type="file" accept=".csv,.tsv,.txt"
              className="sr-only" aria-label="Upload dataset"
              onChange={handleChange}
            />
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
            <Btn variant="secondary" onClick={handleReset} disabled={!fileName && !logs.length}>Reset</Btn>
            <Btn className="flex-1" disabled={!hasFile || running || backendOk === false} onClick={startTraining}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Training…" : "Start training"}
            </Btn>
          </div>

          {backendOk === false && (
            <p className="mt-2 text-[11px] text-coral text-center">
              Start the backend first
            </p>
          )}
        </GlassCard>

        {/* ── Step 2: Training run ────────────────────────────────────────── */}
        <GlassCard className="p-6 xl:col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {running ? "Step 2 · training in progress" : done ? "Step 2 · complete ✓" : "Step 2 · waiting"}
          </div>
          <h2 className="font-display text-lg font-semibold mt-0.5">Training run</h2>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">
                {done ? "Training complete ✓" : running ? "In progress — do not close this tab…" : "No active run"}
              </span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${done ? "bg-success" : trainError ? "bg-coral" : "gradient-primary shadow-glow"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {!hasFile ? "Upload a dataset to begin"
                : trainError ? "Training failed — see logs below"
                : done ? "Model saved — ready to use"
                : running ? "Processing on the Python backend…"
                : "Click Start training"}
            </div>
          </div>

          {/* Log terminal */}
          <div className="mt-5 rounded-lg bg-background/70 border border-border font-mono text-[12px] leading-relaxed p-4 h-56 overflow-auto">
            {logs.length === 0
              ? <div className="text-muted-foreground italic">Training logs will stream here in real-time…</div>
              : logs.map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.includes("[SUCCESS]") || l.includes("[DONE]") || l.includes("[RESULT]")
                        ? "text-success"
                        : l.includes("[ERROR]")
                        ? "text-coral"
                        : l.includes("[STEP") || l.includes("[INFO]")
                        ? "text-muted-foreground"
                        : "text-foreground/70"
                    }
                  >
                    <span className="text-primary select-none">› </span>{l}
                  </div>
                ))}
            <div ref={logEndRef} />
          </div>
        </GlassCard>

        {/* ── Step 3: Results ──────────────────────────────────────────────── */}
        <GlassCard className={`p-6 xl:col-span-3 ${done && !trainError ? "ring-1 ring-success/30" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {done && !trainError && (
                <div className="h-11 w-11 rounded-xl bg-success/15 text-success grid place-items-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
              {trainError && (
                <div className="h-11 w-11 rounded-xl bg-coral/15 text-coral grid place-items-center">
                  <XCircle className="h-5 w-5" />
                </div>
              )}
              <div>
                <div className={`text-[11px] uppercase tracking-wider ${done && !trainError ? "text-success" : trainError ? "text-coral" : "text-muted-foreground"}`}>
                  Best candidate
                </div>
                <h3 className={`font-display text-lg font-semibold ${done ? "" : "text-muted-foreground"}`}>
                  {trainError
                    ? "Training failed"
                    : metrics
                    ? metrics.best_model
                    : done
                    ? "Model trained successfully"
                    : "No model trained yet"}
                </h3>
              </div>
            </div>
            {done && !trainError && (
              <div className="flex gap-2">
                <Btn variant="secondary">Compare</Btn>
                <Btn>Promote to production</Btn>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["AUC-ROC",        metrics?.auc           ?? (done ? "—" : "—")],
              ["Avg Precision",  metrics?.avg_precision  ?? (done ? "—" : "—")],
              ["Recall",         metrics?.recall         ?? (done ? "—" : "—")],
              ["Precision",      metrics?.precision      ?? (done ? "—" : "—")],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-surface-2/60 border border-border/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className={`font-display text-xl font-semibold tabular-nums ${v === "—" ? "text-muted-foreground" : "text-success"}`}>{v}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
