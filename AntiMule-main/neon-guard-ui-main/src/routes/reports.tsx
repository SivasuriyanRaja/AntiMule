import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import {
  Btn,
  GlassCard,
  RiskBadge,
  SectionHeader,
  StatusBadge,
} from "@/components/antimule/primitives";
import { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Download,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
} from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: Reports,
});

type SARStatus = "draft" | "submitted";
type RiskTier = "low" | "med" | "high";

interface SARReport {
  id: string;
  caseRef: string;
  account: string;
  customerName: string;
  tier: RiskTier;
  status: SARStatus;
  filedBy: string;
  createdAt: string;
  submittedAt?: string;
  narrative: string;
  transactionAmount: string;
  transactionPeriod: string;
  suspiciousActivity: string;
}

const INITIAL_REPORTS: SARReport[] = [
  {
    id: "SAR-2024-041",
    caseRef: "C-2036",
    account: "ACC-55892",
    customerName: "James Morrow",
    tier: "high",
    status: "submitted",
    filedBy: "You",
    createdAt: "2026-06-03T11:30:00Z",
    submittedAt: "2026-06-04T09:00:00Z",
    narrative:
      "Subject engaged in structured cash deposits consistently below the $10,000 reporting threshold over 6 consecutive business days, totalling approximately $54,000. Pattern consistent with smurfing activity.",
    transactionAmount: "$54,000",
    transactionPeriod: "01 Jun – 06 Jun 2026",
    suspiciousActivity: "Structuring / Smurfing",
  },
  {
    id: "SAR-2024-040",
    caseRef: "C-2041",
    account: "ACC-88421",
    customerName: "Priya Mehta",
    tier: "high",
    status: "draft",
    filedBy: "You",
    createdAt: "2026-06-08T14:20:00Z",
    narrative:
      "Account exhibited 14 outbound wire transfers to 9 different beneficiaries across 5 jurisdictions within 24 hours. Unusual velocity inconsistent with account profile.",
    transactionAmount: "$31,200",
    transactionPeriod: "07 Jun – 08 Jun 2026",
    suspiciousActivity: "Unusual Wire Transfer Pattern",
  },
];

function SARFormModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (r: SARReport) => void;
}) {
  const [form, setForm] = useState({
    account: "",
    customerName: "",
    caseRef: "",
    tier: "high" as RiskTier,
    narrative: "",
    transactionAmount: "",
    transactionPeriod: "",
    suspiciousActivity: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const report: SARReport = {
      id: `SAR-2024-${Math.floor(Math.random() * 900 + 100)}`,
      caseRef: form.caseRef,
      account: form.account,
      customerName: form.customerName,
      tier: form.tier,
      status: "draft",
      filedBy: localStorage.getItem("user_name") || "Officer",
      createdAt: new Date().toISOString(),
      narrative: form.narrative,
      transactionAmount: form.transactionAmount,
      transactionPeriod: form.transactionPeriod,
      suspiciousActivity: form.suspiciousActivity,
    };
    onSubmit(report);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <GlassCard className="w-full max-w-2xl p-6 anim-rise mb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold">New Suspicious Activity Report</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              FinCEN SAR filing — all fields are required
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account ID</label>
              <input required value={form.account} onChange={(e) => set("account", e.target.value)}
                placeholder="ACC-XXXXX"
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject Name</label>
              <input required value={form.customerName} onChange={(e) => set("customerName", e.target.value)}
                placeholder="Full legal name"
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Case Reference</label>
              <input value={form.caseRef} onChange={(e) => set("caseRef", e.target.value)}
                placeholder="C-XXXX (optional)"
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Classification</label>
              <select value={form.tier} onChange={(e) => set("tier", e.target.value as RiskTier)}
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="high">High Risk</option>
                <option value="med">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Amount</label>
              <input required value={form.transactionAmount} onChange={(e) => set("transactionAmount", e.target.value)}
                placeholder="e.g. $45,000"
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transaction Period</label>
              <input required value={form.transactionPeriod} onChange={(e) => set("transactionPeriod", e.target.value)}
                placeholder="e.g. 01 Jun – 05 Jun 2026"
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suspicious Activity Type</label>
            <input required value={form.suspiciousActivity} onChange={(e) => set("suspiciousActivity", e.target.value)}
              placeholder="e.g. Structuring, Money Mule, Wire Fraud…"
              className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Narrative Description</label>
            <textarea required rows={4} value={form.narrative} onChange={(e) => set("narrative", e.target.value)}
              placeholder="Describe the suspicious activity in detail, including transaction patterns, timing, and why it is suspicious…"
              className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Btn>
            <Btn type="submit" variant="gold" className="flex-1 justify-center">
              <FileText className="h-4 w-4" />
              Save as Draft
            </Btn>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

function SARCard({ report, onSubmit }: { report: SARReport; onSubmit: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard className={`p-5 transition-all ${report.status === "submitted" ? "ring-success/20" : "ring-gold/20"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold">{report.id}</span>
            {report.caseRef && (
              <span className="text-xs text-muted-foreground">→ {report.caseRef}</span>
            )}
            <StatusBadge status={report.status} />
            <RiskBadge tier={report.tier} />
          </div>
          <p className="text-base font-semibold mt-1.5">{report.customerName}</p>
          <p className="text-xs text-muted-foreground">{report.account} · {report.suspiciousActivity}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created {new Date(report.createdAt).toLocaleDateString("en-GB")}
            </span>
            {report.submittedAt && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" />
                Submitted {new Date(report.submittedAt).toLocaleDateString("en-GB")}
              </span>
            )}
            <span>Filed by: {report.filedBy}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Btn variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Collapse" : "View"}
          </Btn>
          {report.status === "draft" && (
            <Btn variant="gold" size="sm" onClick={() => onSubmit(report.id)}>
              <CheckCircle2 className="h-4 w-4" />
              Submit SAR
            </Btn>
          )}
          <Btn variant="secondary" size="sm">
            <Printer className="h-4 w-4" />
          </Btn>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border/40 space-y-4 anim-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Total Amount", value: report.transactionAmount },
              { label: "Period", value: report.transactionPeriod },
              { label: "Activity Type", value: report.suspiciousActivity },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-surface-2/40 p-3 border border-border/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-sm font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Narrative</p>
            <p className="text-sm text-muted-foreground leading-relaxed bg-surface-2/30 rounded-lg p-3 border border-border/30">
              {report.narrative}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function Reports() {
  const [reports, setReports] = useState<SARReport[]>(INITIAL_REPORTS);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "submitted">("all");

  const filtered = reports.filter((r) => {
    const matchSearch =
      !search ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.account.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || r.status === filter;
    return matchSearch && matchFilter;
  });

  const submitReport = (id: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "submitted" as SARStatus, submittedAt: new Date().toISOString() } : r
      )
    );
  };

  const drafts = reports.filter((r) => r.status === "draft").length;
  const submitted = reports.filter((r) => r.status === "submitted").length;

  return (
    <AppShell>
      {showModal && (
        <SARFormModal
          onClose={() => setShowModal(false)}
          onSubmit={(r) => setReports((prev) => [r, ...prev])}
        />
      )}

      <SectionHeader
        eyebrow="Compliance · SAR Management"
        title="Suspicious Activity Reports"
        subtitle="Create, manage, and submit SAR filings to FinCEN. All reports are logged and traceable."
        actions={
          <>
            <Btn variant="secondary">
              <Download className="h-4 w-4" />
              Export All
            </Btn>
            <Btn variant="gold" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" />
              New SAR
            </Btn>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total SARs", value: reports.length, icon: FileText, color: "text-foreground", bg: "bg-surface-2" },
          { label: "Drafts", value: drafts, icon: AlertTriangle, color: "text-gold", bg: "bg-gold/15" },
          { label: "Submitted", value: submitted, icon: CheckCircle2, color: "text-success", bg: "bg-success/15" },
          { label: "This Month", value: reports.filter(r => new Date(r.createdAt).getMonth() === new Date().getMonth()).length, icon: Clock, color: "text-primary", bg: "bg-primary/15" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <GlassCard key={label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg ${bg} ${color} flex items-center justify-center shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-display text-2xl font-semibold">{value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <GlassCard className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by SAR ID, account, or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface/60 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", "draft", "submitted"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filter === f
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-2"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* SAR cards */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((r) => (
            <SARCard key={r.id} report={r} onSubmit={submitReport} />
          ))
        ) : (
          <GlassCard className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-base font-semibold text-muted-foreground">No SAR reports found</p>
            <p className="text-sm text-muted-foreground">Create your first SAR filing to get started.</p>
            <Btn variant="gold" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> New SAR
            </Btn>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
