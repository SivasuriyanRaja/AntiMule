import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/antimule/AuthShell";
import { GlassCard, Btn } from "@/components/antimule/primitives";
import { useState } from "react";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8005/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.status === "success") {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_email", data.user.email);
        localStorage.setItem("user_name", data.user.name || "");
        navigate({ to: "/" });
      } else {
        setError(data.detail || "Invalid credentials. Please check your employee ID and password.");
      }
    } catch {
      setError("Unable to connect to the compliance server. Please contact IT support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <GlassCard className="p-7">
        <div className="mb-6">
          <h2 className="font-display text-xl font-semibold">Officer Sign In</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to the AML Compliance Portal
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg border border-critical/30 bg-critical/10 text-critical text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Employee Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="officer@yourbank.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50 transition-shadow"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Password
              </label>
              <a href="#" className="text-xs text-primary hover:underline">
                Reset password
              </a>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPwd ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50 transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <label htmlFor="remember-me" className="text-xs text-muted-foreground select-none cursor-pointer">
              Keep me signed in on this device
            </label>
          </div>

          <Btn
            id="login-submit"
            type="submit"
            variant="gold"
            disabled={loading}
            className="w-full justify-center mt-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Verifying credentials…" : "Sign in to Portal"}
          </Btn>
        </form>

        <hr className="divider-gold my-5" />

        <p className="text-center text-xs text-muted-foreground">
          New officer account?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Request access
          </Link>
        </p>
      </GlassCard>
    </AuthShell>
  );
}
