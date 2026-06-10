import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/antimule/AppShell";
import {
  Btn,
  GlassCard,
  RiskBadge,
  SectionHeader,
  StatusBadge,
} from "@/components/antimule/primitives";
import { useState, useMemo } from "react";
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ArrowUpRight,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/cases")({
  component: Cases,
});

type CaseStatus = "open" | "reviewing" | "escalated" | "closed";
type RiskTier = "low" | "med" | "high";

interface CaseNote {
  author: string;
  text: string;
  time: string;
}

interface CaseItem {
  id: string;
  account: string;
  customerName: string;
  tier: RiskTier;
  status: CaseStatus;
  score: number;
  opened: string;
  assignee: string;
  notes: CaseNote[];
  flagReason: string;
}

const INITIAL_CASES: CaseItem[] = [
  {
    id: "C-2041",
    account: "ACC-88421",
    customerName: "Priya Mehta",
    tier: "high",
    status: "open",
    score: 87,
    opened: "2026-06-08T09:14:00Z",
    assignee: "You",
    flagReason: "Unusual cross-border transaction velocity. 14 transfers in 24h.",
    notes: [],
  },
  {
    id: "C-2040",
    account: "ACC-77391",
    customerName: "Daniel Osei",
    tier: "high",
    status: "reviewing",
    score: 79,
    opened: "2026-06-05T14:22:00Z",
    assignee: "You",
    flagReason: "High debit ratio combined with new account (< 3 months).",
    notes: [
      { author: "You", text: "Requested KYC documents. Awaiting response.", time: "2026-06-06T10:00:00Z" },
    ],
  },
  {
    id: "C-2038",
    account: "ACC-66102",
    customerName: "Lin Wei",
    tier: "med",
    status: "reviewing",
    score: 61,
    opened: "2026-06-03T11:05:00Z",
    assignee: "S. Patel",
    flagReason: "Network centrality score elevated — linked to 3 flagged accounts.",
    notes: [],
  },
  {
    id: "C-2036",
    account: "ACC-55892",
    customerName: "James Morrow",
    tier: "high",
    status: "escalated",
    score: 94,
    opened: "2026-06-01T08:30:00Z",
    assignee: "You",
    flagReason: "Structured deposits below reporting threshold over 6 consecutive days.",
    notes: [
      { author: "You", text: "Escalated to Senior AML Officer.", time: "2026-06-02T09:00:00Z" },
      { author: "R. Singh", text: "SAR filing initiated.", time: "2026-06-03T11:30:00Z" },
    ],
  },
  {
    id: "C-2031",
    account: "ACC-44213",
    customerName: "Aisha Bello",
    tier: "low",
    status: "closed",
    score: 22,
    opened: "2026-05-28T15:00:00Z",
    assignee: "You",
    flagReason: "Flagged by batch scan. Review confirmed low risk.",
    notes: [
      { author: "You", text: "Reviewed. No suspicious activity. Closing case.", time: "2026-05-30T12:00:00Z" },
    ],
  },
  {
    id: "C-2028",
    account: "ACC-33104",
    customerName: "Tomasz Kowalski",
    tier: "med",
    status: "closed",
    score: 55,
    opened: "2026-05-25T10:20:00Z",
    assignee: "S. Patel",
    flagReason: "Elevated transaction velocity. Explained by business account activity.",
    notes: [],
  },
];

const STATUS_FILTERS = ["All", "Open", "Under Review", "Escalated", "Closed"] as const;

function NewCaseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: CaseItem) => void }) {
  const [account, setAccount] = useState("");
  const [customer, setCustomer] = useState("");
  const [reason, setReason] = useState("");
  const [tier, setTier] = useState<RiskTier>("med");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCase: CaseItem = {
      id: `C-${2042 + Math.floor(Math.random() * 100)}`,
      account,
      customerName: customer,
      tier,
      status: "open",
      score: tier === "high" ? 80 + Math.floor(Math.random() * 15) : tier === "med" ? 50 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 20),
      opened: new Date().toISOString(),
      assignee: "You",
      flagReason: reason,
      notes: [],
    };
    onAdd(newCase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <GlassCard className="w-full max-w-lg p-6 anim-rise">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold">Open New Case</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account ID</label>
              <input
                required
                placeholder="ACC-XXXXX"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer Name</label>
              <input
                required
                placeholder="Full name"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as RiskTier)}
              className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flag Reason</label>
            <textarea
              required
              rows={3}
              placeholder="Describe the reason for flagging this account…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Btn type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">
              Cancel
            </Btn>
            <Btn type="submit" variant="gold" className="flex-1 justify-center">
              Open Case
            </Btn>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

function CaseRow({ item, onUpdate }: { item: CaseItem; onUpdate: (updated: CaseItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState("");

  const addNote = () => {
    if (!noteText.trim()) return;
    const note: CaseNote = {
      author: localStorage.getItem("user_name") || "Officer",
      text: noteText.trim(),
      time: new Date().toISOString(),
    };
    onUpdate({ ...item, notes: [...item.notes, note] });
    setNoteText("");
  };

  const setStatus = (status: CaseStatus) => onUpdate({ ...item, status });

  const statusColor = {
    open: "text-critical",
    reviewing: "text-warning",
    escalated: "text-primary",
    closed: "text-success",
  }[item.status];

  return (
    <>
      <tr
        className="hover:bg-surface-2/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 pl-4 pr-2">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="font-mono text-sm font-medium">{item.id}</span>
          </div>
        </td>
        <td className="py-3 px-2">
          <div>
            <p className="text-sm font-medium">{item.customerName}</p>
            <p className="text-xs text-muted-foreground">{item.account}</p>
          </div>
        </td>
        <td className="py-3 px-2">
          <RiskBadge tier={item.tier} />
        </td>
        <td className="py-3 px-2">
          <span className={`font-mono font-bold text-sm tabular-nums ${statusColor}`}>{item.score}</span>
        </td>
        <td className="py-3 px-2">
          <StatusBadge status={item.status} />
        </td>
        <td className="py-3 px-2 text-xs text-muted-foreground">{item.assignee}</td>
        <td className="py-3 px-2 text-xs text-muted-foreground">
          {new Date(item.opened).toLocaleDateString("en-GB")}
        </td>
        <td className="py-3 pl-2 pr-4 text-right">
          {item.notes.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> {item.notes.length}
            </span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-4 pb-4">
            <div className="rounded-xl border border-border/40 bg-surface-2/30 p-4 space-y-4">
              {/* Flag reason */}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Flag Reason</p>
                <p className="text-sm">{item.flagReason}</p>
              </div>

              {/* Status actions */}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {(["open", "reviewing", "escalated", "closed"] as CaseStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        item.status === s
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "bg-surface border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s === "reviewing" ? "Under Review" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                  Case Notes ({item.notes.length})
                </p>
                {item.notes.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {item.notes.map((n, i) => (
                      <div key={i} className="flex gap-2.5 text-sm">
                        <div className="h-6 w-6 rounded-full gradient-gold flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0 mt-0.5">
                          {n.author[0]}
                        </div>
                        <div>
                          <span className="font-medium">{n.author}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {new Date(n.time).toLocaleString()}
                          </span>
                          <p className="text-muted-foreground mt-0.5">{n.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNote()}
                    placeholder="Add a case note…"
                    className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <Btn variant="secondary" size="sm" onClick={addNote}>
                    Add note
                  </Btn>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                <Btn variant="danger" size="sm">
                  <ArrowUpRight className="h-4 w-4" />
                  Escalate
                </Btn>
                <Btn variant="gold" size="sm">
                  <CheckCircle2 className="h-4 w-4" />
                  File SAR
                </Btn>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Cases() {
  const [cases, setCases] = useState<CaseItem[]>(INITIAL_CASES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const matchSearch =
        !search ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.account.toLowerCase().includes(search.toLowerCase()) ||
        c.customerName.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Open" && c.status === "open") ||
        (statusFilter === "Under Review" && c.status === "reviewing") ||
        (statusFilter === "Escalated" && c.status === "escalated") ||
        (statusFilter === "Closed" && c.status === "closed");
      return matchSearch && matchStatus;
    });
  }, [cases, search, statusFilter]);

  const openCount = cases.filter((c) => c.status === "open").length;
  const escalatedCount = cases.filter((c) => c.status === "escalated").length;
  const reviewingCount = cases.filter((c) => c.status === "reviewing").length;

  const updateCase = (updated: CaseItem) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <AppShell>
      {showModal && (
        <NewCaseModal
          onClose={() => setShowModal(false)}
          onAdd={(c) => setCases((prev) => [c, ...prev])}
        />
      )}

      <SectionHeader
        eyebrow="Operations · Case Management"
        title="Case Queue"
        subtitle="Review, assign, and escalate flagged accounts. Track progress from identification to resolution."
        actions={
          <Btn variant="gold" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Open New Case
          </Btn>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Cases", value: cases.length, icon: Briefcase, tone: "default" as const },
          { label: "Open", value: openCount, icon: AlertTriangle, tone: "critical" as const },
          { label: "Under Review", value: reviewingCount, icon: Clock, tone: "warning" as const },
          { label: "Escalated", value: escalatedCount, icon: ArrowUpRight, tone: "info" as const },
        ].map(({ label, value, icon: Icon, tone }) => (
          <GlassCard key={label} tone={tone} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                tone === "critical" ? "bg-critical/15 text-critical" :
                tone === "warning" ? "bg-gold/15 text-gold" :
                tone === "info" ? "bg-primary/15 text-primary" :
                "bg-surface-2 text-muted-foreground"
              }`}>
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
              placeholder="Search by case ID, account, or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface/60 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? "bg-primary/20 border border-primary/40 text-primary"
                    : "border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Cases table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-surface-2/30">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="text-left py-3 pl-4 pr-2 font-medium">Case ID</th>
                <th className="text-left py-3 px-2 font-medium">Customer</th>
                <th className="text-left py-3 px-2 font-medium">Risk</th>
                <th className="text-left py-3 px-2 font-medium">Score</th>
                <th className="text-left py-3 px-2 font-medium">Status</th>
                <th className="text-left py-3 px-2 font-medium">Assignee</th>
                <th className="text-left py-3 px-2 font-medium">Opened</th>
                <th className="text-right py-3 pl-2 pr-4 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <CaseRow key={item.id} item={item} onUpdate={updateCase} />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground text-sm">
                    No cases match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </AppShell>
  );
}
