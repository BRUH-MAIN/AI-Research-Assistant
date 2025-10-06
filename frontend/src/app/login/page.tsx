"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "../services/authService";
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const data = await authService.signIn(email, password);
      setMessage({ type: 'success', text: 'Login successful!' });
      router.push('/');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = authService.getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
        setLoading(false);
      }
      // If successful, user will be redirected to Google OAuth
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to authenticate with Google' });
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-glow-iris opacity-70 blur-3xl" aria-hidden />
      <div className="relative z-10 grid w-full max-w-5xl gap-10 rounded-[40px] border border-white/10 bg-white/5 p-10 shadow-soft backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Welcome back</p>
            <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
              Continue where your latest research threads left off.
            </h2>
            <p className="text-sm text-white/70">
              Secure workspaces, synced conversations, and annotated papers await. Sign in to resume your momentum.
            </p>
          </div>
          <div className="hidden rounded-3xl border border-white/10 bg-white/4 p-6 text-sm text-white/80 lg:block">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Highlights</p>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                <span>Persistent memory across sessions and devices.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                <span>Lightning quick paper search with transparent provenance.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-rose-400" />
                <span>Export-ready summaries tailored to your audience.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/6 p-8 shadow-soft">
            <div className="text-center">
              <h3 className="text-2xl font-semibold">Sign in to AI Research Assistant</h3>
              <p className="mt-2 text-sm text-white/60">
                Or
                <Link href="/signup" className="ml-1 text-accent">
                  create a new account
                </Link>
              </p>
            </div>

            {message && (
              <div
                className={`mt-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  <ExclamationCircleIcon className="h-5 w-5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleEmailLogin}>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-xs uppercase tracking-[0.3em] text-white/50">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="you@university.edu"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="password" className="text-xs uppercase tracking-[0.3em] text-white/50">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-white/50"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-white/60">
                <Link href="/forgot-password" className="font-medium text-accent">
                  Forgot password?
                </Link>
                <span>Need help? support@airesearch.app</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-4 py-3 text-sm font-semibold shadow-soft transition hover:shadow-floating disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                    <span>Signing in…</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </button>

              <div className="relative text-center">
                <span className="relative inline-block bg-transparent px-4 text-xs uppercase tracking-[0.3em] text-white/40">
                  Or continue with
                </span>
                <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" aria-hidden />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium text-white/80 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-white/40">
            <Link href="/" className="text-accent">
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;