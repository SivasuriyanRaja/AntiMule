import { ReactNode } from "react";

type Tone = "default" | "info" | "warning" | "critical" | "success" | "gold";

const toneRing: Record<Tone, string> = {
  default: "ring-border/60",
  info: "ring-primary/30",
  warning: "ring-gold/30",
  critical: "ring-critical/40",
  success: "ring-success/30",
  gold: "ring-primary/40",
};
const toneGlow: Record<Tone, string> = {
  default: "",
  info: "shadow-[0_0_40px_-14px_var(--color-primary)]",
  warning: "shadow-[0_0_40px_-14px_var(--color-gold)]",
  critical: "shadow-[0_0_40px_-14px_var(--color-critical)]",
  success: "shadow-[0_0_40px_-14px_var(--color-success)]",
  gold: "shadow-gold",
};

export function GlassCard({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={`glass rounded-xl ring-1 ${toneRing[tone]} ${toneGlow[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function GoldCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-gold rounded-xl ring-1 ring-primary/30 shadow-gold ${className}`}>
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "low" | "med" | "high" | "info" | "gold";
}) {
  const tones = {
    default: "bg-surface-2 text-foreground border-border",
    low: "bg-success/15 text-success border-success/30",
    med: "bg-gold/15 text-gold border-gold/30",
    high: "bg-critical/15 text-critical border-critical/30",
    info: "bg-primary/15 text-primary border-primary/30",
    gold: "bg-primary/20 text-primary border-primary/40",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: "open" | "reviewing" | "escalated" | "closed" | "draft" | "submitted" }) {
  const config = {
    open: { label: "Open", cls: "bg-critical/15 text-critical border-critical/30" },
    reviewing: { label: "Under Review", cls: "bg-warning/15 text-warning border-warning/30" },
    escalated: { label: "Escalated", cls: "bg-primary/15 text-primary border-primary/30" },
    closed: { label: "Closed", cls: "bg-success/15 text-success border-success/30" },
    draft: { label: "Draft", cls: "bg-surface-2 text-muted-foreground border-border" },
    submitted: { label: "Submitted", cls: "bg-success/15 text-success border-success/30" },
  };
  const { label, cls } = config[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

export function RiskBadge({ tier }: { tier: "low" | "med" | "high" }) {
  const config = {
    low: { label: "Low Risk", cls: "bg-success/15 text-success border-success/30", dot: "bg-success" },
    med: { label: "Medium Risk", cls: "bg-gold/15 text-gold border-gold/30", dot: "bg-gold" },
    high: { label: "High Risk", cls: "bg-critical/15 text-critical border-critical/30", dot: "bg-critical" },
  };
  const { label, cls, dot } = config[tier];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function Btn({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary:
      "gradient-primary text-primary-foreground shadow-glow hover:brightness-110",
    gold:
      "gradient-gold text-primary-foreground shadow-gold hover:brightness-110",
    secondary:
      "bg-surface-2 text-foreground border border-border hover:bg-surface",
    ghost: "text-foreground hover:bg-surface-2",
    danger:
      "bg-critical/15 text-critical border border-critical/30 hover:bg-critical/25",
  } as const;
  const sizes = {
    sm: "h-8 px-3 text-xs rounded-md",
    md: "h-9 px-4 text-sm rounded-lg",
    lg: "h-11 px-6 text-sm rounded-lg",
  } as const;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function MetricTile({
  label,
  value,
  delta,
  tone = "default",
  icon,
  spark,
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: "default" | "info" | "warning" | "critical" | "success" | "gold";
  icon?: ReactNode;
  spark?: ReactNode;
}) {
  const deltaColor =
    delta?.startsWith("+") ? "text-success" : delta?.startsWith("-") ? "text-critical" : "text-muted-foreground";

  const iconBg: Record<string, string> = {
    default: "bg-surface-2",
    info: "bg-primary/15",
    warning: "bg-gold/15",
    critical: "bg-critical/15",
    success: "bg-success/15",
    gold: "bg-primary/20",
  };
  const iconColor: Record<string, string> = {
    default: "text-muted-foreground",
    info: "text-primary",
    warning: "text-gold",
    critical: "text-critical",
    success: "text-success",
    gold: "text-primary",
  };

  return (
    <GlassCard tone={tone} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {icon && (
            <div className={`h-9 w-9 rounded-lg ${iconBg[tone]} ${iconColor[tone]} flex items-center justify-center mb-3`}>
              {icon}
            </div>
          )}
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</div>
          {delta && <div className={`mt-1 text-xs ${deltaColor}`}>{delta} vs last 7d</div>}
        </div>
        {spark && <div className="h-12 w-24 opacity-90 shrink-0">{spark}</div>}
      </div>
    </GlassCard>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.20em] text-primary mb-2 font-medium">{eyebrow}</div>
        )}
        <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-surface-2 grid place-items-center text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-base font-semibold text-muted-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
