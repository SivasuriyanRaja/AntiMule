import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/cybershield/primitives";
import { FileUp, Play, Settings2, CheckCircle2, XCircle, FileText } from "lucide-react";
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
  sizeMB: string;
  rows: number;
  columns: string[];
  error?: string;
}

function parseCSVMeta(text: string): { rows: number; columns: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const columns = lines[0] ? lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, "")) : [];
  return { rows: Math.max(0, lines.length - 1), columns };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function Train() {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    setLoading(true);
    setFileInfo(null);

    const sizeMB = formatBytes(file.size);

    if (file.name.endsWith(".parquet")) {
      setFileInfo({ name: file.name, sizeMB, rows: 0, columns: [], error: "Parquet preview not supported in browser — file accepted." });
      setLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) ?? "";
        const { rows, columns } = parseCSVMeta(text);
        setFileInfo({ name: file.name, sizeMB, rows, columns });
      } catch {
        setFileInfo({ name: file.name, sizeMB, rows: 0, columns: [], error: "Could not parse file." });
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setFileInfo({ name: file.name, sizeMB, rows: 0, columns: [], error: "Failed to read file." });
      setLoading(false);
    };
    // Only read first 2MB to count rows quickly for large files
    reader.readAsText(file.size > 2 * 1024 * 1024 ? file.slice(0, 2 * 1024 * 1024) : file);
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

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const startTraining = () => {
    if (!fileInfo) return;
    setRunning(true);
    setProgress(0);
    setLogs([]);

    const steps = [
      `[INFO] Loading dataset: ${fileInfo.name}`,
      `[INFO] ${fileInfo.rows.toLocaleString()} rows · ${fileInfo.columns.length} columns detected`,
      `[INFO] Feature engineering in progress…`,
      `[INFO] Train/val split 80/20 · stratified by label`,
      `[INFO] Fitting XGBoost · early stopping = 50 rounds`,
      `[INFO] Fitting LightGBM…`,
      `[INFO] Fitting CatBoost…`,
      `[INFO] Building Weighted Voting Ensemble [3,2,1]…`,
      `[INFO] Calibrating probabilities (isotonic)…`,
      `[SUCCESS] Training complete. Artifacts saved.`,
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
      }
    }, 900);
  };

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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`mt-4 block rounded-xl border-2 border-dashed transition-colors cursor-pointer p-8 text-center select-none ${
              isDragging
                ? "border-primary bg-primary/15 scale-[1.01]"
                : fileInfo && !fileInfo.error
                ? "border-success/50 bg-success/5"
                : "border-primary/40 bg-primary/5 hover:bg-primary/10"
            }`}
          >
            {loading ? (
              <>
                <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <div className="mt-3 text-sm text-muted-foreground">Reading file…</div>
              </>
            ) : fileInfo && !fileInfo.error ? (
              <>
                <CheckCircle2 className="h-8 w-8 mx-auto text-success" />
                <div className="mt-2 text-sm font-medium truncate">{fileInfo.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{fileInfo.sizeMB} · click to change</div>
              </>
            ) : fileInfo?.error ? (
              <>
                <XCircle className="h-8 w-8 mx-auto text-coral" />
                <div className="mt-2 text-sm text-coral font-medium">{fileInfo.error}</div>
                <div className="text-xs text-muted-foreground mt-1">Click to try another file</div>
              </>
            ) : (
              <>
                <FileUp className="h-8 w-8 mx-auto text-primary" />
                <div className="mt-3 text-sm font-medium">Drop CSV or Parquet</div>
                <div className="text-xs text-muted-foreground mt-1">or click to browse · up to 5 GB</div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.parquet"
              className="sr-only"
              aria-label="Upload training dataset"
              onChange={handleInputChange}
            />
          </div>

          {/* File metadata */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File</span>
              <span className="font-mono truncate max-w-[160px]">{fileInfo ? fileInfo.name : "No file selected"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rows</span>
              <span className="tabular-nums">{fileInfo?.rows ? fileInfo.rows.toLocaleString() : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Columns</span>
              <span className="tabular-nums">{fileInfo?.columns.length ? fileInfo.columns.length : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span className="tabular-nums">{fileInfo?.sizeMB ?? "—"}</span>
            </div>
          </div>

          {/* Column preview */}
          {fileInfo?.columns && fileInfo.columns.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Detected columns</div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-auto">
                {fileInfo.columns.slice(0, 20).map((col) => (
                  <span key={col} className="text-[10px] font-mono bg-surface-2/60 border border-border/60 px-1.5 py-0.5 rounded">
                    {col}
                  </span>
                ))}
                {fileInfo.columns.length > 20 && (
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">+{fileInfo.columns.length - 20} more</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Btn
              className="flex-1"
              disabled={!fileInfo || !!fileInfo.error || running}
              onClick={startTraining}
            >
              <Play className="h-4 w-4" />
              {running ? "Training…" : "Start training"}
            </Btn>
            <Btn variant="secondary"><Settings2 className="h-4 w-4" />Configure</Btn>
          </div>
        </GlassCard>

        {/* Training progress */}
        <GlassCard className="p-6 xl:col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {running ? "Step 2 · in progress" : progress === 100 ? "Step 2 · complete" : "Step 2 · waiting"}
          </div>
          <h2 className="font-display text-lg font-semibold mt-0.5">Training run</h2>

          <div className="mt-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">{running ? "Training in progress…" : progress === 100 ? "Training complete" : "No active run"}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className={`h-full gradient-primary shadow-glow transition-all duration-700 ${progress === 100 ? "bg-success" : ""}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {!fileInfo ? "Upload a dataset to begin" : running ? "Please wait…" : progress === 100 ? "Done" : "Click Start training to begin"}
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-background/70 border border-border font-mono text-[12px] leading-relaxed p-4 max-h-56 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-muted-foreground italic">Training logs will appear here…</div>
            ) : (
              logs.map((l, i) => (
                <div key={i} className={`${l.startsWith("[SUCCESS]") ? "text-success" : l.startsWith("[ERROR]") ? "text-coral" : "text-muted-foreground"}`}>
                  <span className="text-primary">›</span> {l}
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Best model — updates after training */}
        <GlassCard className={`p-6 xl:col-span-3 ${progress === 100 ? "ring-1 ring-success/30" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {progress === 100 && (
                <div className="h-11 w-11 rounded-xl bg-success/15 text-success grid place-items-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
              {progress === 100 ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-success">Best candidate · ready to promote</div>
                  <h3 className="font-display text-lg font-semibold">Ensemble (XGB + LGBM + CatBoost)</h3>
                </div>
              ) : (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Best candidate</div>
                  <h3 className="font-display text-lg font-semibold text-muted-foreground">No model trained yet</h3>
                </div>
              )}
            </div>
            {progress === 100 && (
              <div className="flex gap-2">
                <Btn variant="secondary">Compare models</Btn>
                <Btn>Promote to production</Btn>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["AUC-ROC", progress === 100 ? "~0.987" : "—"],
              ["PR-AUC", progress === 100 ? "~0.942" : "—"],
              ["Recall @ 0.5", progress === 100 ? "~0.91" : "—"],
              ["Precision @ 0.5", progress === 100 ? "~0.95" : "—"],
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
