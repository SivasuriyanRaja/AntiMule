import { ReactNode } from "react";

type Tone = "default" | "info" | "warning" | "critical" | "success";

const toneRing: Record<Tone, string> = {
  default: "ring-border/60",
  info: "ring-primary/40",
  warning: "ring-gold/40",
  critical: "ring-coral/50",
  success: "ring-success/40",
};
const toneGlow: Record<Tone, string> = {
  default: "",
  info: "shadow-[0_0_40px_-12px_var(--color-primary)]",
  warning: "shadow-[0_0_40px_-12px_var(--color-gold)]",
  critical: "shadow-[0_0_40px_-12px_var(--color-coral)]",
  success: "shadow-[0_0_40px_-12px_var(--color-success)]",
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

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "low" | "med" | "high" | "info";
}) {
  const tones = {
    default: "bg-surface-2 text-foreground border-border",
    low: "bg-success/15 text-success border-success/30",
    med: "bg-gold/15 text-gold border-gold/30",
    high: "bg-coral/15 text-coral border-coral/30",
    info: "bg-primary/15 text-primary border-primary/30",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
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
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary:
      "gradient-primary text-primary-foreground shadow-glow hover:brightness-110",
    secondary:
      "bg-surface-2 text-foreground border border-border hover:bg-surface",
    ghost: "text-foreground hover:bg-surface-2",
    danger:
      "bg-coral/15 text-coral border border-coral/30 hover:bg-coral/25",
  } as const;
  const sizes = {
    sm: "h-8 px-3 text-xs rounded-md",
    md: "h-10 px-4 text-sm rounded-lg",
    lg: "h-12 px-6 text-base rounded-lg",
  } as const;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
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
  spark,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "info" | "warning" | "critical" | "success";
  spark?: ReactNode;
}) {
  const deltaColor =
    delta?.startsWith("+") ? "text-success" : delta?.startsWith("-") ? "text-coral" : "text-muted-foreground";
  return (
    <GlassCard tone={tone} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</div>
          {delta && <div className={`mt-1 text-xs ${deltaColor}`}>{delta} vs last 7d</div>}
        </div>
        {spark && <div className="h-12 w-24 opacity-90">{spark}</div>}
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
          <div className="text-[11px] uppercase tracking-[0.18em] text-primary mb-2">{eyebrow}</div>
        )}
        <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
