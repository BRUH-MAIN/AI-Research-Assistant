"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type Message = { type: "success" | "error"; text: string };
type ThemeOption = "dark" | "light";

type SettingsState = {
  theme: ThemeOption;
  notifications: {
    email: boolean;
    push: boolean;
    research_updates: boolean;
    chat_messages: boolean;
  };
  privacy: {
    profile_visibility: "public" | "private" | "friends";
    search_history: boolean;
    analytics: boolean;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const initialSettings: SettingsState = {
  theme: "dark",
  notifications: {
    email: true,
    push: false,
    research_updates: true,
    chat_messages: true,
  },
  privacy: {
    profile_visibility: "public",
    search_history: true,
    analytics: true,
  },
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (!session?.user) {
        router.push("/login");
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleThemeChange = (nextTheme: ThemeOption) => {
    setSettings((prev) => ({
      ...prev,
      theme: nextTheme,
    }));
  };

  const handleNotificationToggle = (key: keyof SettingsState["notifications"]) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const handlePrivacyToggle = <K extends keyof SettingsState["privacy"]>(
    key: K,
    value: SettingsState["privacy"][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({
        type: "error",
        text: "We couldn’t save your preferences. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const ActiveThemeIcon = settings.theme === "dark" ? MoonIcon : SunIcon;
  const themeDescriptor = useMemo(
    () =>
      settings.theme === "dark"
        ? "Dim interface with higher contrast for late-night work."
        : "Bright interface tuned for daylight readability and presentation.",
    [settings.theme]
  );

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-glow-iris opacity-60 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
          <p className="text-sm text-white/70">Loading your preferences…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-glow-iris opacity-70 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-16 sm:px-10 lg:px-16">
        <header className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Workspace preferences</p>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
              Tailor how your research studio sounds, signals, and safeguards.
            </h1>
            <p className="text-sm text-white/70">
              Configure lighting, notification cadence, and privacy posture so your assistant complements your focus instead of interrupting it.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-soft">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Current theme</p>
            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
                      <ActiveThemeIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1 text-sm text-white/70">
                <p className="text-sm font-semibold text-white">{settings.theme === "dark" ? "Dark mode" : "Light mode"}</p>
                <p>{themeDescriptor}</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/4 p-4 text-xs text-white/60">
              <p>
                Sync your theme choice with the desktop app via <strong className="text-white">Preferences → Display</strong> to stay consistent across devices.
              </p>
            </div>
          </div>
        </header>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-center gap-3 rounded-3xl border px-4 py-3 text-sm shadow-soft",
              message.type === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-400/30 bg-rose-500/10 text-rose-200"
            )}
          >
            {message.type === "success" ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-soft">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-6 w-6 text-white/70" />
                  <div>
                    <p className="text-sm font-semibold text-white">{user.email}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Account owner</p>
                  </div>
                </div>
                <div className="grid gap-3 text-sm text-white/70">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/60">Theme</span>
                    <span className="text-white/85">{settings.theme === "dark" ? "Dark" : "Light"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/60">Email notifications</span>
                    <span className="text-white/85">{settings.notifications.email ? "Enabled" : "Muted"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/60">Profile visibility</span>
                    <span className="text-white/85">{settings.privacy.profile_visibility}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/4 p-6 shadow-soft">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Tips</p>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>Enable research updates to receive curated paper drops every Friday.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Set profile visibility to friends when coordinating with closed cohorts.</span>
                </li>
              </ul>
            </div>
          </aside>

          <section className="space-y-8">
            <div className="rounded-[32px] border border-white/10 bg-white/7 p-8 shadow-soft backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                {settings.theme === "dark" ? (
                  <MoonIcon className="h-6 w-6 text-accent" />
                ) : (
                  <SunIcon className="h-6 w-6 text-amber-300" />
                )}
                <div>
                  <p className="text-lg font-semibold text-white">Appearance</p>
                  <p className="text-sm text-white/70">Choose how the studio renders content across sessions.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {([
                  {
                    id: "dark" as ThemeOption,
                    label: "Dark mode",
                    icon: MoonIcon,
                    description: "Inky backdrop with cinematic contrast and subtle glows.",
                  },
                  {
                    id: "light" as ThemeOption,
                    label: "Light mode",
                    icon: SunIcon,
                    description: "Magazine-inspired whites with softened drop shadows.",
                  },
                ] satisfies Array<{ id: ThemeOption; label: string; icon: typeof MoonIcon; description: string }>).map(
                  (option) => {
                    const isActive = settings.theme === option.id;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleThemeChange(option.id)}
                        className={cn(
                          "flex h-full flex-col gap-3 rounded-3xl border px-5 py-4 text-left transition",
                          isActive
                            ? "border-accent bg-accent/10 text-white shadow-soft"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                        )}
                      >
                        <span className="flex items-center gap-3 text-sm font-semibold">
                          <Icon className="h-5 w-5" />
                          {option.label}
                        </span>
                        <span className="text-xs text-white/60">{option.description}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/7 p-8 shadow-soft backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                <BellIcon className="h-6 w-6 text-accent" />
                <div>
                  <p className="text-lg font-semibold text-white">Notifications</p>
                  <p className="text-sm text-white/70">Decide when the assistant can interrupt, whisper, or wait.</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  {
                    key: "email" as const,
                    label: "Email digests",
                    description: "Summaries of new activity, papers, and decisions.",
                  },
                  {
                    key: "research_updates" as const,
                    label: "Research updates",
                    description: "Friday dispatch covering new citations and RAG highlights.",
                  },
                  {
                    key: "chat_messages" as const,
                    label: "Chat pulses",
                    description: "Ping when collaborators reply or the assistant posts results.",
                  },
                  {
                    key: "push" as const,
                    label: "Push notifications",
                    description: "Real-time nudges to keep experiments on-track.",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/80"
                  >
                    <div className="max-w-md space-y-1">
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/60">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.notifications[item.key]}
                      onClick={() => handleNotificationToggle(item.key)}
                      className={cn(
                        "relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition",
                        settings.notifications[item.key]
                          ? "bg-accent shadow-soft"
                          : "bg-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-soft transition",
                          settings.notifications[item.key] ? "translate-x-6" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/7 p-8 shadow-soft backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-accent" />
                <div>
                  <p className="text-lg font-semibold text-white">Privacy & security</p>
                  <p className="text-sm text-white/70">Control what’s visible and how telemetry is gathered.</p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">Profile visibility</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {([
                      { id: "public", label: "Public" },
                      { id: "friends", label: "Friends" },
                      { id: "private", label: "Private" },
                    ] satisfies Array<{ id: SettingsState["privacy"]["profile_visibility"]; label: string }>).map(
                      (option) => {
                        const isActive = settings.privacy.profile_visibility === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handlePrivacyToggle("profile_visibility", option.id)}
                            className={cn(
                              "rounded-3xl border px-4 py-3 text-left text-sm transition",
                              isActive
                                ? "border-accent bg-accent/10 text-white"
                                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {[
                  {
                    key: "search_history" as const,
                    label: "Save search history",
                    description: "Allow personalised recall when revisiting queries.",
                  },
                  {
                    key: "analytics" as const,
                    label: "Share anonymised analytics",
                    description: "Help us improve the experience by sharing usage patterns.",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/80"
                  >
                    <div className="max-w-md space-y-1">
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/60">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.privacy[item.key]}
                      onClick={() => handlePrivacyToggle(item.key, !settings.privacy[item.key])}
                      className={cn(
                        "relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition",
                        settings.privacy[item.key] ? "bg-accent shadow-soft" : "bg-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-soft transition",
                          settings.privacy[item.key] ? "translate-x-6" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSettings(initialSettings)}
                  className="rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  Restore defaults
                </button>
                <button
                  type="button"
                  disabled={saving}
                  aria-busy={saving}
                  onClick={handleSave}
                  className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-6 py-3 text-sm font-semibold shadow-soft transition hover:shadow-floating disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save settings</span>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}