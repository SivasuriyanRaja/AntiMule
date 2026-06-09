import { ReactNode } from "react";
import { ShieldMascot } from "./Mascot";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Abstract Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-coral/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10 anim-rise">
        <div className="flex flex-col items-center justify-center mb-8 gap-3">
          <ShieldMascot size={48} />
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight">AntiMule</h1>
            <p className="text-sm text-muted-foreground">Fraud Intelligence Platform</p>
          </div>
        </div>
        
        {children}
      </div>
    </div>
  );
}
