import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/antimule/AuthShell";
import { GlassCard, Btn } from "@/components/antimule/primitives";
import { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned a non-JSON response (Status: ${res.status}). Ensure VITE_API_URL is correct and the backend is running.`);
      }
      
      if (res.ok && data.status === "success") {
        setSuccess(true);
        setTimeout(() => navigate({ to: "/login" }), 2000);
      } else {
        setError(data.detail || "Registration failed. Contact your system administrator.");
      }
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
          setError(`Network Error: Could not reach ${API_BASE_URL || 'the API'}. Check VITE_API_URL or CORS.`);
      } else {
          setError(err.message || "Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <GlassCard className="p-7">
        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <div>
              <p className="font-semibold text-base">Account Created</p>
              <p className="text-sm text-muted-foreground mt-1">
                Redirecting you to the sign-in portal…
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="font-display text-xl font-semibold">Request Portal Access</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Register a new compliance officer account
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
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="e.g. Sarah Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Employee Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="officer@yourbank.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Confirm Password
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                />
              </div>

              <Btn
                id="register-submit"
                type="submit"
                variant="gold"
                disabled={loading}
                className="w-full justify-center mt-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Creating account…" : "Create Officer Account"}
              </Btn>
            </form>

            <hr className="divider-gold my-5" />
            <p className="text-center text-xs text-muted-foreground">
              Already have access?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </>
        )}
      </GlassCard>
    </AuthShell>
  );
}
