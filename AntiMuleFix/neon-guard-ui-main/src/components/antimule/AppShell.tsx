import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ReactNode, useState, useEffect, useRef } from "react";
import { ShieldMascot } from "./Mascot";
import {
  LayoutDashboard, Brain, UserSearch, FileStack, LineChart,
  Bell, Search, Settings, LogOut, User, ChevronDown,
  Menu, X, Shield,
} from "lucide-react";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/train", label: "Train Model", icon: Brain },
  { to: "/score", label: "Single Score", icon: UserSearch },
  { to: "/batch", label: "Batch Scoring", icon: FileStack },
  { to: "/insights", label: "Insights", icon: LineChart },
] as const;

const API_BASE = "http://localhost:8005";

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location?.pathname ?? "/" });
  const navigate = useNavigate();

  const [modelStatus, setModelStatus] = useState<"loaded" | "none" | "checking">("checking");
  const [dbStatus, setDbStatus] = useState<{ mongodb?: boolean; status?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const userName  = localStorage.getItem("user_name")  || "Analyst";
  const userEmail = localStorage.getItem("user_email") || "";

  // Check model status from /health (more reliable than /model/metrics)
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(d => setModelStatus(d.model_loaded ? "loaded" : "none"))
      .catch(() => setModelStatus("none"));
  }, []);

  // Check DB status
  useEffect(() => {
    fetch(`${API_BASE}/db/status`)
      .then(r => r.json())
      .then(d => setDbStatus(d))
      .catch(() => setDbStatus(null));
  }, []);

  // Fetch alerts for notifications
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch(`${API_BASE}/db/alerts?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.alerts) setNotifications(d.alerts); })
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Search handler — queries /db/recent and filters client-side
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    try {
      const token = localStorage.getItem("auth_token");
      const r = await fetch(`${API_BASE}/db/recent?limit=200`, {
        headers: { Authorization: `Bearer ${token || ""}` }
      });
      const data = await r.json();
      const filtered = (data.results || []).filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(q.toLowerCase())
      ).slice(0, 6);
      setSearchResults(filtered);
      setShowSearch(true);
    } catch { setShowSearch(false); }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate({ to: "/login" });
  };

  const navLinks = nav.map(({ to, label, icon: Icon }) => {
    const active = to === "/" ? path === "/" : (path?.startsWith(to) ?? false);
    return (
      <Link
        key={to}
        to={to}
        onClick={() => setMobileMenuOpen(false)}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
          active
            ? "bg-sidebar-accent text-foreground ring-1 ring-primary/30 shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:translate-x-0.5"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
        <span>{label}</span>
        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-glow animate-pulse" />}
      </Link>
    );
  });

  return (
    <div className="min-h-dvh flex bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl px-4 py-6 sticky top-0 h-dvh transition-all duration-300">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 pb-4">
          <ShieldMascot size={36} />
          <div>
            <div className="font-display text-base font-semibold tracking-tight">AntiMule</div>
            <div className="text-[11px] text-muted-foreground">Fraud Intelligence</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 mt-2" aria-label="Primary">
          {navLinks}
        </nav>

        {/* Settings link in sidebar */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200 hover:translate-x-0.5 mt-1"
        >
          <Settings className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span>Settings</span>
        </button>

        {/* Status panel */}
        <div className="mt-auto space-y-2">
          {/* Model status */}
          <div className="glass rounded-xl p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${modelStatus === "loaded" ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
              <span className={modelStatus === "loaded" ? "text-green-400 font-medium" : ""}>
                {modelStatus === "checking" ? "Checking model…" : modelStatus === "loaded" ? "✓ Model ready" : "No model loaded"}
              </span>
            </div>
            {modelStatus === "none" && <div className="mt-1 text-[11px]">Go to Train Model to get started</div>}
          </div>
          {/* DB status */}
          {dbStatus && (
            <div className="glass rounded-xl p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${dbStatus.mongodb ? "bg-green-400" : "bg-red-400"}`} />
                <span className={dbStatus.mongodb ? "text-green-400" : "text-red-400"}>
                  MongoDB {dbStatus.mongodb ? "connected" : "offline"}
                </span>
              </div>
              {dbStatus.total_scored !== undefined && (
                <div className="mt-1 text-muted-foreground">{dbStatus.total_scored} records stored</div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile slide-out menu ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border px-4 py-6 flex flex-col gap-2 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between px-2 pb-4">
              <div className="flex items-center gap-3">
                <ShieldMascot size={32} />
                <div className="font-display font-semibold">AntiMule</div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">{navLinks}</nav>
            <button
              onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60"
            >
              <Settings className="h-4 w-4" /><span>Settings</span>
            </button>
            <div className="mt-auto glass rounded-xl p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${modelStatus === "loaded" ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
                <span className={modelStatus === "loaded" ? "text-green-400" : "text-muted-foreground"}>
                  {modelStatus === "loaded" ? "Model loaded ✓" : "No model loaded"}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden h-9 w-9 rounded-lg border border-border bg-surface/60 flex items-center justify-center"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <ShieldMascot size={26} />
              <span className="font-display font-semibold text-sm">AntiMule</span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xl ml-2 relative" ref={searchRef}>
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search accounts, transactions, alerts…"
                  className="w-full rounded-lg border border-border bg-surface/60 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  aria-label="Global search"
                />
              </label>
              {/* Search results dropdown */}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2 text-xs text-muted-foreground border-b border-border px-3 py-2">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                  </div>
                  {searchResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 hover:bg-surface-2 cursor-pointer text-sm transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          r.risk_tier === "CRITICAL" ? "bg-red-400" :
                          r.risk_tier === "HIGH" ? "bg-orange-400" :
                          r.risk_tier === "MEDIUM" ? "bg-yellow-400" : "bg-green-400"
                        }`} />
                        <span className="font-mono text-xs">{r.risk_tier || "—"}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Score: {r.risk_score}</span>
                        <span>{r.source?.toUpperCase()}</span>
                        <span>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  ))}
                  {searchResults.length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">No matching records found</div>
                  )}
                </div>
              )}
              {showSearch && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-surface border border-border rounded-xl shadow-xl z-50 p-4 text-sm text-muted-foreground text-center">
                  No results for "{searchQuery}"
                </div>
              )}
            </div>

            {/* Settings button in header (visible on all screens) */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="h-9 w-9 rounded-lg border border-border bg-surface/60 hover:bg-surface flex items-center justify-center transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                className="relative h-9 w-9 rounded-lg border border-border bg-surface/60 hover:bg-surface flex items-center justify-center transition-colors"
                aria-label="Notifications"
                onClick={() => setNotifOpen(o => !o)}
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="font-medium text-sm">Alerts</span>
                    <span className="text-xs text-muted-foreground">{notifications.length} unread</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">No alerts</div>
                  ) : (
                    notifications.slice(0, 4).map((n, i) => (
                      <div key={i} className="px-4 py-3 border-b border-border/40 hover:bg-surface-2 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs font-medium text-red-400">{n.risk_tier} RISK</span>
                          <span className="ml-auto text-xs text-muted-foreground">Score: {n.risk_score}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{n.alert_reason || "High risk account detected"}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative hidden sm:block" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 pl-3 ml-1 border-l border-border hover:opacity-80 transition-opacity"
                aria-label="User menu"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-xs font-bold text-white shadow">
                  {userName[0]?.toUpperCase()}
                </div>
                <div className="text-xs leading-tight hidden md:block">
                  <div className="font-medium">{userName}</div>
                  <div className="text-muted-foreground text-[11px]">{userEmail || "Analyst"}</div>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-border">
                    <div className="font-medium text-sm">{userName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{userEmail}</div>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-surface-2 transition-colors text-left"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-red-500/10 text-red-400 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 anim-rise">{children}</main>
      </div>

      {/* Settings modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
          <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-semibold">Settings</h2>
              <button onClick={() => setSettingsOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Profile</label>
                <div className="mt-2 p-3 rounded-lg bg-surface-2 border border-border/40 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-xs">{userEmail}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">System</label>
                <div className="mt-2 p-3 rounded-lg bg-surface-2 border border-border/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">API</span>
                    <span className="text-xs font-mono text-green-400">localhost:8005</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Model</span>
                    <span className={`text-xs font-medium ${modelStatus === "loaded" ? "text-green-400" : "text-yellow-400"}`}>
                      {modelStatus === "loaded" ? "✓ Loaded" : "Not trained"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">MongoDB</span>
                    <span className={`text-xs font-medium ${dbStatus?.mongodb ? "text-green-400" : "text-red-400"}`}>
                      {dbStatus?.mongodb ? "✓ Connected" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
