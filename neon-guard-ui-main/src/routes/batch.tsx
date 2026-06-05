import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cybershield/AppShell";
import { Btn, GlassCard, SectionHeader } from "@/components/cybershield/primitives";
import { Download, FileUp, Filter, TableProperties } from "lucide-react";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "Batch Scoring · CyberShield" },
      { name: "description", content: "Score thousands of accounts at once and triage the riskiest." },
    ],
  }),
  component: Batch,
});

function Batch() {
  return (
    <AppShell>
      <SectionHeader
        eyebrow="Batch · no active run"
        title="Batch Scoring"
        subtitle="Upload a CSV or Parquet file of accounts to score them all at once."
        actions={
          <>
            <Btn variant="secondary" disabled><Filter className="h-4 w-4" />Filters</Btn>
            <Btn disabled><Download className="h-4 w-4" />Export CSV</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Uploader */}
        <GlassCard tone="info" className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Upload batch</h2>
          <label className="mt-4 block rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer p-6 text-center">
            <FileUp className="h-7 w-7 mx-auto text-primary" />
            <div className="mt-2 text-sm font-medium">Drop CSV or Parquet</div>
            <div className="text-xs text-muted-foreground mt-0.5">or click to browse · up to 5 GB</div>
            <input type="file" className="sr-only" aria-label="Upload batch file" />
          </label>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Legit", color: "var(--color-success)" },
              { label: "Review", color: "var(--color-gold)" },
              { label: "Mule", color: "var(--color-coral)" },
            ].map((d) => (
              <div key={d.label} className="rounded-lg bg-surface-2/60 border border-border/60 p-2.5">
                <div className="text-[10px] uppercase text-muted-foreground">{d.label}</div>
                <div className="font-display text-lg font-semibold tabular-nums text-muted-foreground">—</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Tier distribution — empty */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Tier distribution</h2>
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center">
              <TableProperties className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No data yet</p>
            <p className="text-xs text-muted-foreground">Upload a batch file to see the tier distribution</p>
          </div>
        </GlassCard>

        {/* Risk histogram — empty */}
        <GlassCard className="p-6 xl:col-span-4">
          <h2 className="font-display text-lg font-semibold">Risk histogram</h2>
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-surface-2 grid place-items-center">
              <Filter className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No data yet</p>
            <p className="text-xs text-muted-foreground">Risk distribution chart will appear after batch scoring</p>
          </div>
        </GlassCard>

        {/* Results table — empty state */}
        <GlassCard className="p-0 xl:col-span-12 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <h2 className="font-display text-lg font-semibold">Results · highest risk first</h2>
            <span className="text-xs text-muted-foreground">No results to display</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Account</th>
                  <th className="text-left font-medium px-3 py-3">Risk</th>
                  <th className="text-left font-medium px-3 py-3">Tier</th>
                  <th className="text-left font-medium px-3 py-3">Country</th>
                  <th className="text-left font-medium px-3 py-3">Drivers</th>
                  <th className="text-right font-medium px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground text-sm">
                    Upload a batch file to see scored results here.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
