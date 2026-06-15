import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ReactNode, useState } from "react";
import {
  LayoutDashboard,
  Brain,
  UserSearch,
  FileStack,
  LineChart,
  Bell,
  Search,
  LogOut,
  Briefcase,
  FileText,
  ClipboardList,
  ChevronDown,
  Building2,
  Menu,
  X,
} from "lucide-react";

const nav = [
  { to: "/", label: "Command Center", icon: LayoutDashboard, group: "main" },
  { to: "/cases", label: "Case Management", icon: Briefcase, group: "operations" },
  { to: "/score", label: "Screen Customer", icon: UserSearch, group: "operations" },
  { to: "/batch", label: "Batch Screening", icon: FileStack, group: "operations" },
  { to: "/reports", label: "SAR Reports", icon: FileText, group: "compliance" },
  { to: "/audit", label: "Audit Log", icon: ClipboardList, group: "compliance" },
  { to: "/train", label: "Retrain Model", icon: Brain, group: "system" },
  { to: "/insights", label: "Model Insights", icon: LineChart, group: "system" },
] as const;

const groups: { key: string; label: string }[] = [
  { key: "main", label: "" },
  { key: "operations", label: "Operations" },
  { key: "compliance", label: "Compliance" },
  { key: "system", label: "ML System" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location?.pathname ?? "/" });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userName = localStorage.getItem("user_name") || "Officer";
  const userEmail = localStorage.getItem("user_email") || "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
    navigate({ to: "/login" });
  };

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-dvh flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 h-dvh z-40 w-72 shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Bank branding */}
        <div className="px-5 py-5 border-b border-sidebar-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold shrink-0">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-base font-semibold text-foreground tracking-tight">
                AntiMule Bank
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                Compliance Workstation
              </div>
            </div>
          </div>
        </div>

        {/* Date / compliance status */}
        <div className="px-5 py-3 border-b border-sidebar-border/40">
          <div className="text-[10px] text-muted-foreground">{today}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-1.5 w-1.5 rounded-full status-online" />
            <span className="text-[11px] text-success font-medium">System Operational</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Primary navigation">
          {groups.map(({ key, label }) => {
            const items = nav.filter((n) => n.group === key);
            return (
              <div key={key} className="mb-2">
                {label && (
                  <div className="px-3 mb-1 mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    {label}
                  </div>
                )}
                {items.map(({ to, label: itemLabel, icon: Icon }) => {
                  const active =
                    to === "/" ? path === "/" : path?.startsWith(to) ?? false;
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={`sidebar-active-line group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 mb-0.5 ${
                        active
                          ? "bg-sidebar-accent text-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                      <span className="flex-1">{itemLabel}</span>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User profile at bottom */}
        <div className="px-3 py-4 border-t border-sidebar-border/60">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors text-left"
          >
            <div className="h-8 w-8 rounded-full gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{userName}</div>
              <div className="text-[10px] text-muted-foreground truncate">Compliance Officer</div>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {userMenuOpen && (
            <div className="mt-1 px-1">
              {userEmail && (
                <div className="px-3 py-1.5 text-[11px] text-muted-foreground truncate border-b border-sidebar-border/40 mb-1">
                  {userEmail}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-critical hover:bg-critical/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-20 border-b border-border/50 bg-background/70 backdrop-blur-xl scan-line">
          <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
            {/* Mobile menu toggle */}
            <button
              className="lg:hidden h-9 w-9 rounded-lg border border-border bg-surface/60 hover:bg-surface flex items-center justify-center"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            {/* Search */}
            <div className="flex-1 max-w-lg">
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search accounts, cases, transactions…"
                  className="w-full rounded-lg border border-border bg-surface/50 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  aria-label="Global search"
                />
              </label>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Notifications */}
              <button
                className="relative h-9 w-9 rounded-lg border border-border bg-surface/60 hover:bg-surface flex items-center justify-center transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-critical anim-pulse-soft" />
              </button>

              {/* User avatar (desktop) */}
              <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-border">
                <div className="h-8 w-8 rounded-full gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {initials}
                </div>
                <div className="text-xs leading-tight hidden md:block">
                  <div className="font-medium">{userName}</div>
                  <div className="text-muted-foreground">Compliance Officer</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 lg:px-6 py-6 anim-rise">{children}</main>
      </div>
    </div>
  );
}
