"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  UserIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type SignupForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type Message = {
  type: "success" | "error";
  text: string;
};

const initialFormState: SignupForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const nameFields: Array<{
  id: "firstName" | "lastName";
  label: string;
  icon: ReactNode;
  autoComplete: "given-name" | "family-name";
}> = [
  {
    id: "firstName",
    label: "First name",
    icon: <UserIcon className="h-4 w-4" />,
    autoComplete: "given-name",
  },
  {
    id: "lastName",
    label: "Last name",
    icon: <UserIcon className="h-4 w-4" />,
    autoComplete: "family-name",
  },
];

const passwordFields: Array<{
  id: "password" | "confirmPassword";
  label: string;
  placeholder: string;
  minLength?: number;
  autoComplete: "new-password";
}> = [
  {
    id: "password",
    label: "Password",
    placeholder: "Create a password",
    minLength: 6,
    autoComplete: "new-password",
  },
  {
    id: "confirmPassword",
    label: "Confirm password",
    placeholder: "Repeat password",
    autoComplete: "new-password",
  },
];

const Signup = () => {
  const [formData, setFormData] = useState<SignupForm>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const router = useRouter();

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleEmailSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long" });
      setLoading(false);
      return;
    }

    try {
      const trimmedEmail = formData.email.trim();

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          },
        },
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: "Account created successfully! Please check your email to verify your account.",
        });
        setFormData(initialFormState);
        // Optionally redirect to login or home page
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
        setLoading(false);
      }
      // If successful, user will be redirected to Google OAuth
    } catch (error) {
      setMessage({ type: "error", text: "Failed to authenticate with Google" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-glow-iris opacity-70 blur-3xl" aria-hidden />
      <div className="relative z-10 grid w-full max-w-5xl gap-10 rounded-[40px] border border-white/10 bg-white/6 p-10 shadow-soft backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-10">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Create your studio</p>
            <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
              Set up a research environment tailored to your curiosity.
            </h2>
            <p className="text-sm text-white/70">
              Invite collaborators, ingest papers, and maintain provenance while your assistant orchestrates context.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">What’s inside</p>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                <span>Unified canvas for notes, conversations, and citations.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                <span>Automated literature triage with ready-to-share briefs.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-rose-400" />
                <span>Secure syncing across devices with fine-grained permissions.</span>
              </li>
            </ul>
          </div>

          <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 lg:block">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Need assistance?</p>
            <p className="mt-2">Reach out to onboarding@airesearch.app for guided setup and custom integrations.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/8 p-8 shadow-soft">
            <div className="text-center">
              <h3 className="text-2xl font-semibold">Create your AI Research Assistant account</h3>
              <p className="mt-2 text-sm text-white/60">
                Already have an account?
                <Link href="/login" className="ml-1 text-accent">
                  Sign in
                </Link>
              </p>
            </div>

            {message && (
              <div
                role="status"
                aria-live="polite"
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

            <form className="mt-8 space-y-5" onSubmit={handleEmailSignup}>
              <div className="grid gap-4 sm:grid-cols-2">
                {nameFields.map((field) => (
                  <div key={field.id} className="flex flex-col gap-2">
                    <label
                      htmlFor={field.id}
                      className="text-xs uppercase tracking-[0.3em] text-white/50"
                    >
                      {field.label}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                        {field.icon}
                      </span>
                      <input
                        id={field.id}
                        name={field.id}
                        type="text"
                        required
                        value={formData[field.id]}
                        onChange={handleInputChange}
                        autoComplete={field.autoComplete}
                        className="w-full rounded-2xl border border-white/15 bg-white/8 px-10 py-3 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                        placeholder={field.label}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Institutional email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                    <EnvelopeIcon className="h-4 w-4" />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-white/15 bg-white/8 px-10 py-3 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="you@institute.edu"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {passwordFields.map((field) => (
                  <div key={field.id} className="flex flex-col gap-2">
                    <label
                      htmlFor={field.id}
                      className="text-xs uppercase tracking-[0.3em] text-white/50"
                    >
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        id={field.id}
                        name={field.id}
                        type={
                          field.id === "password"
                            ? showPassword
                              ? "text"
                              : "password"
                            : showConfirmPassword
                              ? "text"
                              : "password"
                        }
                        autoComplete={field.autoComplete}
                        required
                        minLength={field.minLength}
                        value={formData[field.id]}
                        onChange={handleInputChange}
                        className="w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                        placeholder={field.placeholder}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-white/50"
                        onClick={
                          field.id === "password"
                            ? () => setShowPassword((prev) => !prev)
                            : () => setShowConfirmPassword((prev) => !prev)
                        }
                        aria-label={
                          field.id === "password"
                            ? showPassword
                              ? "Hide password"
                              : "Show password"
                            : showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                        }
                      >
                        {(
                          field.id === "password" ? showPassword : showConfirmPassword
                        ) ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-4 py-3 text-sm font-semibold shadow-soft transition hover:shadow-floating disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                    <span>Creating account…</span>
                  </div>
                ) : (
                  "Create account"
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
                onClick={handleGoogleSignup}
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

export default Signup;