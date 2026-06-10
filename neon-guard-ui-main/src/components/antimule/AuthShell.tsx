import { ReactNode } from "react";
import { Building2, Shield, Lock } from "lucide-react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex bg-background relative overflow-hidden">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 gradient-navy" />
        <div className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 30% 40%, oklch(0.76 0.13 72 / 0.10), transparent 60%),
              radial-gradient(ellipse 60% 40% at 80% 80%, oklch(0.40 0.06 245 / 0.20), transparent 60%)
            `
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(oklch(0.76 0.13 72) 1px, transparent 1px), linear-gradient(90deg, oklch(0.76 0.13 72) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold text-foreground">AntiMule Bank</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Compliance Workstation</div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <div className="text-[11px] uppercase tracking-[0.20em] text-primary mb-4 font-medium">
            Anti-Money Laundering · Fraud Detection · Compliance
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight mb-6">
            Protect your institution with AI-powered compliance intelligence
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
            Purpose-built for banking compliance officers. Screen accounts, manage
            cases, generate SAR reports, and maintain a full audit trail — all
            powered by your trained ML model.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {[
              { icon: Shield, text: "Real-time AML risk scoring" },
              { icon: Lock, text: "SAR report automation" },
              { icon: Building2, text: "Full regulatory audit trail" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer compliance text */}
        <div className="relative z-10">
          <hr className="divider-gold mb-4" />
          <p className="text-[10px] text-muted-foreground">
            Compliant with BSA/AML, FinCEN, and international FATF guidelines.
            All access is logged and audited.
          </p>
        </div>
      </div>

      {/* Right panel - auth form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-critical/5 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl gradient-gold flex items-center justify-center shadow-gold">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">AntiMule Bank</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Compliance Workstation</div>
          </div>
        </div>

        <div className="w-full max-w-sm relative z-10 anim-rise">
          {/* Security notice */}
          <div className="mb-6 flex items-start gap-2.5 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span>
              Access to this system is restricted to authorised bank personnel only.
              Unauthorised access is prohibited and will be prosecuted.
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
