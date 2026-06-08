import { Link, useRouterState } from "@tanstack/react-router";
import { ReactNode } from "react";
import { ShieldMascot } from "./Mascot";
import {
  LayoutDashboard,
  Brain,
  UserSearch,
  FileStack,
  LineChart,
  Bell,
  Search,
  Settings,
} from "lucide-react";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/train", label: "Train Model", icon: Brain },
  { to: "/score", label: "Single Score", icon: UserSearch },
  { to: "/batch", label: "Batch Scoring", icon: FileStack },
  { to: "/insights", label: "Model Insights", icon: LineChart },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location?.pathname ?? "/" });

  return (
    <div className="min-h-dvh flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl px-4 py-6 sticky top-0 h-dvh">
        <div className="flex items-center gap-3 px-2 pb-4">
          <ShieldMascot size={36} />
          <div>
            <div className="font-display text-base font-semibold tracking-tight">AntiMule</div>
            <div className="text-[11px] text-muted-foreground">Fraud Intelligence</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 mt-2" aria-label="Primary">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : (path?.startsWith(to) ?? false);
            return (
              <Link
                key={to}
                to={to}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-foreground ring-1 ring-primary/30"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                <span>{label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto glass rounded-xl p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
            No model loaded
          </div>
          <div className="mt-1">Train a model to get started</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/60 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
            <div className="lg:hidden flex items-center gap-2">
              <ShieldMascot size={28} />
              <span className="font-display font-semibold">AntiMule</span>
            </div>
            <div className="flex-1 max-w-xl ml-2">
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search accounts, transactions, alerts…"
                  className="w-full rounded-lg border border-border bg-surface/60 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label="Global search"
                />
              </label>
            </div>
            <button
              className="relative h-9 w-9 rounded-lg border border-border bg-surface/60 hover:bg-surface flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-coral" />
            </button>
            <button
              className="h-9 w-9 rounded-lg border border-border bg-surface/60 hover:bg-surface flex items-center justify-center"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 ml-1 border-l border-border">
              <div className="h-8 w-8 rounded-full gradient-primary grid place-items-center text-xs font-semibold">U</div>
              <div className="text-xs leading-tight">
                <div className="font-medium">User</div>
                <div className="text-muted-foreground">Analyst</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 anim-rise">{children}</main>
      </div>
    </div>
  );
}
