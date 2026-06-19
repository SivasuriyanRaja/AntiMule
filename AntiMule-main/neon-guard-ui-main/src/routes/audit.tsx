import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import { Btn, GlassCard, RiskBadge, SectionHeader } from "@/components/antimule/primitives";
import { useState, useMemo } from "react";
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
} from "lucide-react";

export const Route = createFileRoute("/audit")({
  component: AuditLog,
});

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

const AUDIT_DATA: AuditEntry[] = [
  { id: "AU-9041", timestamp: "2026-06-10T07:02:00Z", officer: "You", action: "login", description: "Officer logged in to the compliance portal", outcome: "success" },
  { id: "AU-9040", timestamp: "2026-06-10T06:58:00Z", officer: "S. Patel", action: "sar_submit", description: "SAR SAR-2024-039 submitted to FinCEN", entity: "SAR-2024-039", outcome: "success" },
  { id: "AU-9039", timestamp: "2026-06-09T15:32:00Z", officer: "You", action: "case_update", description: "Case C-2036 status changed to Escalated", entity: "C-2036", outcome: "warning" },
  { id: "AU-9038", timestamp: "2026-06-09T14:11:00Z", officer: "You", action: "score", description: "Account ACC-88421 screened — High Risk (score: 87)", entity: "ACC-88421", riskTier: "high", outcome: "warning" },
  { id: "AU-9037", timestamp: "2026-06-09T13:55:00Z", officer: "R. Singh", action: "batch", description: "Batch screening run: 142 accounts screened", outcome: "success" },
  { id: "AU-9036", timestamp: "2026-06-09T12:00:00Z", officer: "S. Patel", action: "case_open", description: "New case C-2040 opened for ACC-77391", entity: "C-2040", outcome: "warning" },
  { id: "AU-9035", timestamp: "2026-06-09T10:30:00Z", officer: "You", action: "sar_create", description: "SAR draft SAR-2024-040 created for ACC-88421", entity: "SAR-2024-040", outcome: "success" },
  { id: "AU-9034", timestamp: "2026-06-08T17:45:00Z", officer: "R. Singh", action: "logout", description: "Officer logged out of the compliance portal", outcome: "success" },
  { id: "AU-9033", timestamp: "2026-06-08T16:20:00Z", officer: "You", action: "score", description: "Account ACC-66102 screened — Medium Risk (score: 61)", entity: "ACC-66102", riskTier: "med", outcome: "success" },
  { id: "AU-9032", timestamp: "2026-06-08T14:00:00Z", officer: "R. Singh", action: "model_train", description: "CatBoost model retrained on 12,430 records. AUC: 0.9841", outcome: "success" },
  { id: "AU-9031", timestamp: "2026-06-07T11:15:00Z", officer: "S. Patel", action: "score", description: "Account ACC-44213 screened — Low Risk (score: 22)", entity: "ACC-44213", riskTier: "low", outcome: "success" },
  { id: "AU-9030", timestamp: "2026-06-07T09:00:00Z", officer: "You", action: "login", description: "Officer logged in to the compliance portal", outcome: "success" },
  { id: "AU-9029", timestamp: "2026-06-06T16:50:00Z", officer: "You", action: "case_update", description: "Case C-2031 closed — no suspicious activity confirmed", entity: "C-2031", outcome: "success" },
  { id: "AU-9028", timestamp: "2026-06-06T15:30:00Z", officer: "R. Singh", action: "sar_submit", description: "SAR SAR-2024-041 submitted to FinCEN", entity: "SAR-2024-041", outcome: "success" },
];

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

function AuditLog() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("All");
  const [officerFilter, setOfficerFilter] = useState("All");

  const officers = useMemo(() => {
    const unique = Array.from(new Set(AUDIT_DATA.map((e) => e.officer)));
    return ["All", ...unique];
  }, []);

  const filtered = useMemo(() => {
    return AUDIT_DATA.filter((entry) => {
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
  }, [search, actionFilter, officerFilter]);

  const handleExport = () => {
    const csv = [
      ["ID", "Timestamp", "Officer", "Action", "Description", "Entity", "Outcome"].join(","),
      ...filtered.map((e) =>
        [
          e.id,
          new Date(e.timestamp).toLocaleString(),
          e.officer,
          ACTION_LABELS[e.action],
          `"${e.description}"`,
          e.entity || "",
          e.outcome || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
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
          <Btn variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Btn>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Events", value: AUDIT_DATA.length },
          { label: "Accounts Screened", value: AUDIT_DATA.filter((e) => e.action === "score" || e.action === "batch").length },
          { label: "SARs Filed", value: AUDIT_DATA.filter((e) => e.action === "sar_submit").length },
          { label: "Active Officers", value: new Set(AUDIT_DATA.map((e) => e.officer)).size },
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

      {/* Audit timeline */}
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
                  const Icon = ACTION_ICONS[entry.action];
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
                            {entry.officer === "You"
                              ? (localStorage.getItem("user_name") || "U")[0].toUpperCase()
                              : entry.officer[0]}
                          </div>
                          <span className="text-sm">{entry.officer}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ACTION_COLORS[entry.action]}`}
                        >
                          <Icon className="h-3 w-3" />
                          {ACTION_LABELS[entry.action]}
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
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    No audit events match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {AUDIT_DATA.length} events
          </p>
          <p className="text-xs text-muted-foreground">
            Audit log retained for 7 years per BSA requirements
          </p>
        </div>
      </GlassCard>
    </AppShell>
  );
}
