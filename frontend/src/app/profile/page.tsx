"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import {
  CameraIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  PhoneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { profileService } from "@/app/services/profileService";
import { debugAuth } from "@/app/services/authDebug";
import type { ProfileUpdateData, UserProfile } from "@/app/types/types";
import { cn } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Availability = UserProfile["availability"];
type Message = { type: "success" | "error"; text: string };

type ProfileFormData = {
  first_name: string;
  last_name: string;
  bio: string;
  phone_number: string;
  availability: Availability;
};

const initialFormState: ProfileFormData = {
  first_name: "",
  last_name: "",
  bio: "",
  phone_number: "",
  availability: "available",
};

const availabilityTokens: Record<
  Availability,
  { dot: string; label: string; badge: string; descriptor: string }
> = {
  available: {
    dot: "bg-emerald-400",
    label: "Available",
    badge: "border border-emerald-300/40 bg-emerald-500/10 text-emerald-200",
    descriptor: "Open for collaborations and synchronous sessions.",
  },
  busy: {
    dot: "bg-amber-400",
    label: "Busy",
    badge: "border border-amber-300/40 bg-amber-500/10 text-amber-200",
    descriptor: "Heads-down—ping for async updates only.",
  },
  offline: {
    dot: "bg-white/30",
    label: "Offline",
    badge: "border border-white/20 bg-white/5 text-white/70",
    descriptor: "Offline—expect a response when back in the lab.",
  },
};

const personalFieldConfig: Array<{
  id: keyof ProfileFormData;
  label: string;
  placeholder: string;
  type?: "text" | "tel";
  autoComplete?: string;
}> = [
  {
    id: "first_name",
    label: "First name",
    placeholder: "Jordan",
    autoComplete: "given-name",
  },
  {
    id: "last_name",
    label: "Last name",
    placeholder: "Nguyen",
    autoComplete: "family-name",
  },
  {
    id: "phone_number",
    label: "Phone number",
    placeholder: "+1 (555) 123-4567",
    type: "tel",
    autoComplete: "tel",
  },
];

export default function ProfileSettings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const hydrateProfile = useCallback(async () => {
    setLoading(true);
    try {
      await debugAuth().catch((error) =>
        console.debug("Auth debug check failed", error)
      );

      await profileService.syncProfile();
      const profileData = await profileService.getProfile();
      setProfile(profileData);
      setFormData({
        first_name: profileData.first_name ?? "",
        last_name: profileData.last_name ?? "",
        bio: profileData.bio ?? "",
        phone_number: profileData.phone_number ?? "",
        availability: profileData.availability ?? "available",
      });
    } catch (error) {
      console.error("Failed to load profile:", error);
      setMessage({
        type: "error",
        text: "We couldn’t load your profile. Refresh and try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

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
      await hydrateProfile();
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
  }, [router, hydrateProfile]);

  const fullName = useMemo(() => {
    const fallback = user?.email?.split("@")[0] ?? "Researcher";
    const first = formData.first_name || profile?.first_name;
    const last = formData.last_name || profile?.last_name;

    if (!first && !last) {
      return fallback;
    }

    return `${first ?? ""} ${last ?? ""}`.trim();
  }, [formData.first_name, formData.last_name, profile?.first_name, profile?.last_name, user?.email]);

  const joinedLabel = useMemo(() => {
    if (!profile?.created_at) {
      return "—";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(profile.created_at));
  }, [profile?.created_at]);

  const updatedLabel = useMemo(() => {
    if (!profile?.updated_at) {
      return "Just now";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(profile.updated_at));
  }, [profile?.updated_at]);

  const availabilityInfo = availabilityTokens[formData.availability];
  const bioLength = formData.bio.length;

  const contactEntries = useMemo(
    () => [
      {
        label: "Primary email",
        value: user?.email ?? "—",
        icon: EnvelopeIcon,
        highlight: true,
      },
      {
        label: "Phone",
        value: formData.phone_number || "Add a phone number to help collaborators reach you.",
        icon: PhoneIcon,
        highlight: Boolean(formData.phone_number),
      },
    ],
    [user?.email, formData.phone_number]
  );

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name as keyof ProfileFormData]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload: ProfileUpdateData = { ...formData };
      const updatedProfile = await profileService.updateProfile(payload);
      setProfile(updatedProfile);
      setFormData({
        first_name: updatedProfile.first_name ?? "",
        last_name: updatedProfile.last_name ?? "",
        bio: updatedProfile.bio ?? "",
        phone_number: updatedProfile.phone_number ?? "",
        availability: updatedProfile.availability ?? formData.availability,
      });
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (error) {
      console.error("Failed to update profile:", error);
      setMessage({
        type: "error",
        text: "We couldn’t save your changes. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-glow-iris opacity-60 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
          <p className="text-sm text-white/70">Preparing your profile workspace…</p>
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
        <header className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              Profile settings
            </p>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
              Curate the presence your collaborators see across the studio.
            </h1>
            <p className="text-sm text-white/70">
              Refine your biography, contact signals, and availability so the people working with you always know how to reach you and when you’re in flow.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Latest update
            </p>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <div className="flex items-center justify-between">
                <span>Profile refreshed</span>
                <span className="text-white/60">{updatedLabel}</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-white/80">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                <p className="text-sm text-white/75">
                  Promote your latest projects or pin a lab focus in the bio so new collaborators land with context.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                <p>
                  Need custom onboarding? Email <strong className="text-white">people@airesearch.app</strong> for white-glove setup.
                </p>
              </div>
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

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] xl:grid-cols-[0.8fr_1.2fr]">
          <aside className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-soft">
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="relative h-28 w-28">
                  {profile?.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt="Profile"
                      className="h-28 w-28 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-soft">
                      <UserIcon className="h-12 w-12 text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Update profile picture"
                    className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white transition hover:bg-white/25"
                  >
                    <CameraIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-xl font-semibold text-white">{fullName}</p>
                  <p className="text-sm text-white/60">{user.email}</p>
                </div>

                <div className="flex flex-col items-center gap-2 text-sm text-white/70">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs uppercase tracking-[0.25em]",
                      availabilityInfo.badge
                    )}
                  >
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", availabilityInfo.dot)}
                      aria-hidden
                    />
                    {availabilityInfo.label}
                  </span>
                  <p className="max-w-xs text-center text-white/70">
                    {availabilityInfo.descriptor}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm text-white/70">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="text-white/60">Member since</span>
                  <span className="text-white/85">{joinedLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="text-white/60">Last profile refresh</span>
                  <span className="text-white/85">{updatedLabel}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/4 p-6 shadow-soft">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                Contact signals
              </p>
              <div className="mt-4 space-y-4">
                {contactEntries.map(({ label, value, icon: Icon, highlight }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <Icon className="h-5 w-5 text-white/60" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                        {label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-sm",
                          highlight ? "text-white/85" : "text-white/60"
                        )}
                      >
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="rounded-[32px] border border-white/10 bg-white/7 p-8 shadow-soft backdrop-blur-2xl">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Identity
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {personalFieldConfig.slice(0, 2).map((field) => (
                    <label
                      key={field.id}
                      className="flex flex-col gap-2 text-sm text-white/70"
                    >
                      <span className="text-xs uppercase tracking-[0.25em] text-white/50">
                        {field.label}
                      </span>
                      <input
                        id={field.id}
                        name={field.id}
                        type={field.type ?? "text"}
                        autoComplete={field.autoComplete}
                        value={formData[field.id]}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Contact
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <label className="flex flex-col gap-2 text-sm text-white/70">
                    <span className="text-xs uppercase tracking-[0.25em] text-white/50">
                      Email address
                    </span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      readOnly
                      value={user.email ?? ""}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 placeholder:text-white/30"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-white/70">
                    <span className="text-xs uppercase tracking-[0.25em] text-white/50">
                      {personalFieldConfig[2].label}
                    </span>
                    <input
                      id={personalFieldConfig[2].id}
                      name={personalFieldConfig[2].id}
                      type={personalFieldConfig[2].type ?? "text"}
                      autoComplete={personalFieldConfig[2].autoComplete}
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder={personalFieldConfig[2].placeholder}
                      className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Biography
                </p>
                <div className="mt-4 space-y-2">
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Summarise your current research focus, favourite methodologies, or collaboration wishlist."
                    maxLength={500}
                    rows={5}
                    className="w-full rounded-3xl border border-white/15 bg-white/8 px-4 py-4 text-sm text-white placeholder:text-white/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>500 characters max</span>
                    <span>{bioLength}/500</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Availability
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(Object.keys(availabilityTokens) as Availability[]).map((option) => {
                    const meta = availabilityTokens[option];
                    const isActive = formData.availability === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            availability: option,
                          }))
                        }
                        className={cn(
                          "flex h-full flex-col items-start gap-2 rounded-3xl border px-4 py-4 text-left text-sm transition",
                          isActive
                            ? "border-accent bg-accent/10 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                        )}
                      >
                        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.25em]">
                          <span
                            className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
                            aria-hidden
                          />
                          {meta.label}
                        </span>
                        <span className="text-xs text-white/60">{meta.descriptor}</span>
                      </button>
                    );
                  })}
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
                    onClick={() => hydrateProfile()}
                    className="rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
                  >
                    Reset changes
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    aria-busy={saving}
                    className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-6 py-3 text-sm font-semibold shadow-soft transition hover:shadow-floating disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      <span>Save profile</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}