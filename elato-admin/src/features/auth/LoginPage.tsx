import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button, Input } from "../../components/ui";
import { errorMessage } from "../../lib/query-client";
import { Logo } from "../../components/brand/Logo";

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "authenticated") {
    const redirectTo = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--color-accent-100),transparent_55%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-9 text-center">
          <Logo height={40} className="mx-auto" />
          <p className="mt-2 text-sm text-neutral-500">Sign in to the admin panel</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-neutral-200/80 bg-white p-7 shadow-elevation-lg"
        >
          <div className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
              Sign in
            </Button>
          </div>
        </form>

        <p className="mt-7 text-center text-xs text-neutral-400">
          Trouble signing in? Contact whoever manages ELATŌ's admin accounts.
        </p>
      </div>
    </div>
  );
}
