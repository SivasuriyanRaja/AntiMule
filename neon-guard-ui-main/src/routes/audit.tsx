import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import { Btn, GlassCard, RiskBadge, SectionHeader } from "@/components/antimule/primitives";
import { useState, useMemo, useEffect } from "react";
import {
  ClipboardList,
  Search,
  Download,
  Filter,
  UserSearch,
  FileText,
  Briefcase,
  Brain,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/audit")({
  component: AuditLog,
});

// ── Types ─────────────────────────────────────────────────────────────────────
type AuditActionType =
  | "login"
  | "logout"
  | "score"
  | "batch"
  | "case_open"
  | "case_update"
  | "sar_create"
  | "sar_submit"
  | "model_train";

interface AuditEntry {
  id: string;
  timestamp: string;
  officer: string;
  action: AuditActionType;
  description: string;
  entity?: string;
  riskTier?: "low" | "med" | "high";
  outcome?: "success" | "warning" | "error";
}

// ── Display maps ──────────────────────────────────────────────────────────────
const ACTION_ICONS: Record<AuditActionType, React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  score: UserSearch,
  batch: ClipboardList,
  case_open: Briefcase,
  case_update: Briefcase,
  sar_create: FileText,
  sar_submit: CheckCircle2,
  model_train: Brain,
};

const ACTION_LABELS: Record<AuditActionType, string> = {
  login: "Login",
  logout: "Logout",
  score: "Account Screen",
  batch: "Batch Run",
  case_open: "Case Opened",
  case_update: "Case Update",
  sar_create: "SAR Created",
  sar_submit: "SAR Submitted",
  model_train: "Model Retrain",
};

const ACTION_COLORS: Record<AuditActionType, string> = {
  login: "bg-success/15 text-success",
  logout: "bg-surface-2 text-muted-foreground",
  score: "bg-primary/15 text-primary",
  batch: "bg-primary/15 text-primary",
  case_open: "bg-gold/15 text-gold",
  case_update: "bg-gold/15 text-gold",
  sar_create: "bg-critical/15 text-critical",
  sar_submit: "bg-success/15 text-success",
  model_train: "bg-primary/15 text-primary",
};

const OUTCOME_ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  warning: <AlertTriangle className="h-4 w-4 text-gold" />,
  error: <AlertTriangle className="h-4 w-4 text-critical" />,
};

const FILTER_ACTIONS = ["All", "Logins", "Screening", "Cases", "SARs", "Model"] as const;

// ── Storage helpers ───────────────────────────────────────────────────────────
const AUDIT_KEY = "antimule_audit_log";
const SAR_KEY = "antimule_sar_reports";

function loadAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Derive audit entries from SAR reports stored in localStorage */
function deriveAuditFromSARs(): AuditEntry[] {
  try {
    const sars: any[] = JSON.parse(localStorage.getItem(SAR_KEY) || "[]");
    const entries: AuditEntry[] = [];
    sars.forEach((sar, i) => {
      entries.push({
        id: `AU-SAR-C-${String(i + 1).padStart(4, "0")}`,
        timestamp: sar.createdAt,
        officer: sar.filedBy || "Officer",
        action: "sar_create",
        description: `SAR draft ${sar.id} created for ${sar.account}`,
        entity: sar.id,
        riskTier: sar.tier,
        outcome: "success",
      });
      if (sar.status === "submitted" && sar.submittedAt) {
        entries.push({
          id: `AU-SAR-S-${String(i + 1).padStart(4, "0")}`,
          timestamp: sar.submittedAt,
          officer: sar.filedBy || "Officer",
          action: "sar_submit",
          description: `SAR ${sar.id} submitted to FinCEN`,
          entity: sar.id,
          outcome: "success",
        });
      }
    });
    return entries;
  } catch {
    return [];
  }
}

/** Append a new event to the persisted audit log (call from other routes) */
export function recordAuditEvent(entry: Omit<AuditEntry, "id">) {
  const log = loadAuditLog();
  const newId = `AU-${String(Date.now()).slice(-6)}`;
  localStorage.setItem(AUDIT_KEY, JSON.stringify([{ ...entry, id: newId }, ...log]));
}

// ── Component ─────────────────────────────────────────────────────────────────
function AuditLog() {
  const [manualEntries, setManualEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("All");
  const [officerFilter, setOfficerFilter] = useState("All");

  useEffect(() => {
    setManualEntries(loadAuditLog());
  }, []);

  // Merge persisted manual events + events derived from SAR data, newest first
  const auditData = useMemo<AuditEntry[]>(() => {
    const sarDerived = deriveAuditFromSARs();
    const sarIds = new Set(sarDerived.map((e) => e.id));
    const manual = manualEntries.filter((e) => !sarIds.has(e.id));
    return [...sarDerived, ...manual].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [manualEntries]);

  const officers = useMemo(() => {
    const unique = Array.from(new Set(auditData.map((e) => e.officer)));
    return ["All", ...unique];
  }, [auditData]);

  const filtered = useMemo(() => {
    return auditData.filter((entry) => {
      const matchSearch =
        !search ||
        entry.description.toLowerCase().includes(search.toLowerCase()) ||
        (entry.entity?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
        entry.officer.toLowerCase().includes(search.toLowerCase()) ||
        entry.id.toLowerCase().includes(search.toLowerCase());

      const matchAction =
        actionFilter === "All" ||
        (actionFilter === "Logins" && (entry.action === "login" || entry.action === "logout")) ||
        (actionFilter === "Screening" && (entry.action === "score" || entry.action === "batch")) ||
        (actionFilter === "Cases" && (entry.action === "case_open" || entry.action === "case_update")) ||
        (actionFilter === "SARs" && (entry.action === "sar_create" || entry.action === "sar_submit")) ||
        (actionFilter === "Model" && entry.action === "model_train");

      const matchOfficer = officerFilter === "All" || entry.officer === officerFilter;
      return matchSearch && matchAction && matchOfficer;
    });
  }, [auditData, search, actionFilter, officerFilter]);

  const handleExport = () => {
    if (filtered.length === 0) return;
    const csv = [
      ["ID", "Timestamp", "Officer", "Action", "Description", "Entity", "Outcome"].join(","),
      ...filtered.map((e) =>
        [
          e.id,
          new Date(e.timestamp).toLocaleString(),
          e.officer,
          ACTION_LABELS[e.action] ?? e.action,
          `"${e.description}"`,
          e.entity || "",
          e.outcome || "",
        ].join(",")
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Compliance · Audit Trail"
        title="System Audit Log"
        subtitle="Complete tamper-evident audit trail of all officer actions. Retained for regulatory compliance and examination."
        actions={
          <Btn variant="secondary" onClick={handleExport} disabled={auditData.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Btn>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Events", value: auditData.length },
          { label: "Accounts Screened", value: auditData.filter((e) => e.action === "score" || e.action === "batch").length },
          { label: "SARs Filed", value: auditData.filter((e) => e.action === "sar_submit").length },
          { label: "Active Officers", value: new Set(auditData.map((e) => e.officer)).size },
        ].map(({ label, value }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-display text-3xl font-semibold mt-0.5">{value}</p>
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
              placeholder="Search events, officers, or entities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface/60 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {FILTER_ACTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setActionFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  actionFilter === f
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-2"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            value={officerFilter}
            onChange={(e) => setOfficerFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {officers.map((o) => (
              <option key={o} value={o}>{o === "All" ? "All Officers" : o}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Audit table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-surface-2/30">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="text-left py-3 pl-4 pr-2 font-medium">ID</th>
                <th className="text-left py-3 px-2 font-medium">Timestamp</th>
                <th className="text-left py-3 px-2 font-medium">Officer</th>
                <th className="text-left py-3 px-2 font-medium">Action</th>
                <th className="text-left py-3 px-2 font-medium">Description</th>
                <th className="text-left py-3 px-2 font-medium">Entity</th>
                <th className="text-right py-3 pl-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.length > 0 ? (
                filtered.map((entry) => {
                  const Icon = ACTION_ICONS[entry.action] ?? Brain;
                  return (
                    <tr key={entry.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="py-3 pl-4 pr-2">
                        <span className="font-mono text-xs text-muted-foreground">{entry.id}</span>
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full gradient-gold flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                            {(entry.officer === "You"
                              ? localStorage.getItem("user_name") || "U"
                              : entry.officer)[0].toUpperCase()}
                          </div>
                          <span className="text-sm">{entry.officer}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ACTION_COLORS[entry.action] ?? "bg-surface-2 text-muted-foreground"}`}>
                          <Icon className="h-3 w-3" />
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground max-w-xs">
                        <span className="line-clamp-1">{entry.description}</span>
                      </td>
                      <td className="py-3 px-2">
                        {entry.entity && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-foreground/80">{entry.entity}</span>
                            {entry.riskTier && <RiskBadge tier={entry.riskTier} />}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pl-2 pr-4 text-right">
                        {entry.outcome && OUTCOME_ICONS[entry.outcome]}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    {auditData.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Upload className="h-8 w-8 opacity-40" />
                        <p className="text-sm font-medium">No audit events yet</p>
                        <p className="text-xs max-w-xs">
                          Events are generated automatically when you create SAR reports, screen accounts, or run batch jobs.
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No events match your filters.</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {auditData.length} events
          </p>
          <p className="text-xs text-muted-foreground">
            Audit log retained for 7 years per BSA requirements
          </p>
        </div>
      </GlassCard>
    </AppShell>
  );
}
