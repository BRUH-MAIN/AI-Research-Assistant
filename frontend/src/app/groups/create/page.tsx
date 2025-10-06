"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  LockClosedIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import type { CreateGroupData } from "../../services/groupService";
import { groupService } from "../../services/groupService";
import { authService, type User } from "../../services/authService";

const MAX_NAME = 50;
const MAX_DESCRIPTION = 500;

export default function CreateGroupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInviteCode, setSuccessInviteCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateGroupData>({
    name: "",
    description: "",
    is_public: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const canCreate = useMemo(
    () => currentUserId !== null && currentUserId >= 2,
    [currentUserId]
  );

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const bootstrap = async () => {
      const session = await authService.initializeAuth();
      if (!session) {
        router.push("/login");
        return;
      }

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }

      if (!active) return;
      setUser(currentUser);

      let internalId = authService.getCurrentInternalUserId();
      if (!internalId) {
        internalId = await authService.refreshInternalUserId();
      }

      if (!active) return;
      setCurrentUserId(internalId);

      if (internalId !== null && internalId < 2) {
        setError(
          "Guest accounts can’t create groups yet. Ask an admin to provision a full workspace seat."
        );
      }
    };

    bootstrap();

    const { data } = authService.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setCurrentUserId(null);
        router.push("/login");
        return;
      }
      setUser(session.user);
    });

    subscription = data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [router]);

  const validateField = (field: string, value: string) => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Group name is required.";
        if (value.trim().length < 3) return "Name needs at least 3 characters.";
        if (value.trim().length > MAX_NAME)
          return `Name must stay under ${MAX_NAME} characters.`;
        return "";
      case "description":
        if (value && value.length > MAX_DESCRIPTION)
          return `Description must stay under ${MAX_DESCRIPTION} characters.`;
        return "";
      default:
        return "";
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = event.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (event.target as HTMLInputElement).checked,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormErrors((prev) => {
      const next = { ...prev };
      const message = validateField(name, value);
      if (message) {
        next[name] = message;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessInviteCode(null);

    const nameError = validateField("name", formData.name);
    const descriptionError = validateField("description", formData.description || "");

    const nextErrors: Record<string, string> = {};
    if (nameError) nextErrors.name = nameError;
    if (descriptionError) nextErrors.description = descriptionError;
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError("Fix the highlighted fields before publishing your group.");
      return;
    }

    if (!user || !canCreate || !currentUserId) {
      setError("You need a full account to create a group.");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateGroupData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || "",
        created_by: currentUserId,
      };

      const newGroup = await groupService.createGroup(payload);
      const groupId = newGroup.group_id || newGroup.id;
      setSuccessInviteCode(newGroup.invite_code || null);
      router.push(`/groups/${groupId}`);
    } catch (err) {
      console.error("Failed to create group:", err);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t create that group. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-glow-iris opacity-70 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
          <p className="text-sm text-white/70">Checking your workspace access…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-glow-iris opacity-80 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col gap-12 px-6 pb-24 pt-20 sm:px-10">
        <header className="space-y-6">
          <Link
            href="/groups"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to groups
          </Link>
          <div className="rounded-[40px] border border-white/10 bg-white/6 p-8 shadow-soft backdrop-blur-3xl">
            <div className="flex flex-col gap-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/60">
                Launch a new collective
              </span>
              <h1 className="text-4xl font-semibold leading-tight">
                Spin up a research hub tailor-made for your collaborators.
              </h1>
              <p className="text-sm leading-relaxed text-white/70">
                Name the collective, decide who can discover it, and we’ll generate an invite code that routes members straight into the right workspace with the right permissions.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em]">
                  <UserGroupIcon className="h-4 w-4" />
                  Instant role scaffolding
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em]">
                  <ClipboardDocumentCheckIcon className="h-4 w-4" />
                  Auto-generated invite code
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-[40px] border border-white/10 bg-white/7 p-8 shadow-soft backdrop-blur-3xl">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Group name
                </span>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Lab synthesis guild"
                  maxLength={MAX_NAME}
                  className={`rounded-3xl border bg-white/6 px-5 py-3 text-base text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent ${
                    formErrors.name ? "border-rose-400/50" : "border-white/15"
                  }`}
                />
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{formErrors.name}</span>
                  <span>{formData.name.length}/{MAX_NAME}</span>
                </div>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Description (optional)
                </span>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Outline the purpose, rituals, and cadence for this collective."
                  rows={5}
                  maxLength={MAX_DESCRIPTION}
                  className={`min-h-[140px] rounded-3xl border bg-white/6 px-5 py-3 text-base text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent ${
                    formErrors.description ? "border-rose-400/50" : "border-white/15"
                  }`}
                />
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{formErrors.description}</span>
                  <span>{(formData.description || "").length}/{MAX_DESCRIPTION}</span>
                </div>
              </label>
            </div>

            <fieldset className="space-y-3 text-sm">
              <legend className="text-xs uppercase tracking-[0.3em] text-white/60">Visibility</legend>
              <label className={`flex cursor-pointer flex-col gap-2 rounded-3xl border px-5 py-4 transition ${formData.is_public ? "border-white/12 bg-white/4" : "border-accent/50 bg-accent/10"}`}>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <LockClosedIcon className="h-5 w-5 text-amber-300" />
                  Private group
                </span>
                <span className="text-xs text-white/65">
                  Invite-only. Members join with a code, perfect for sensitive experiments.
                </span>
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={!formData.is_public}
                  onChange={() => setFormData((prev) => ({ ...prev, is_public: false }))}
                  className="hidden"
                />
              </label>
              <label className={`flex cursor-pointer flex-col gap-2 rounded-3xl border px-5 py-4 transition ${formData.is_public ? "border-accent/50 bg-accent/10" : "border-white/12 bg-white/4"}`}>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <GlobeAltIcon className="h-5 w-5 text-emerald-300" />
                  Public group
                </span>
                <span className="text-xs text-white/65">
                  Discoverable by your organisation. Great for open knowledge exchanges.
                </span>
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={formData.is_public}
                  onChange={() => setFormData((prev) => ({ ...prev, is_public: true }))}
                  className="hidden"
                />
              </label>
            </fieldset>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-white/70">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="h-5 w-5 text-accent" />
                <div className="space-y-2">
                  <p className="uppercase tracking-[0.3em] text-white/50">After launch</p>
                  <ul className="space-y-2">
                    <li>• You’ll start as admin and can delegate roles instantly.</li>
                    <li>• A unique invite code unlocks read/write access for members.</li>
                    <li>• Chat, paper, and workflow history syncs across every member.</li>
                  </ul>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-3xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/groups"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !canCreate}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-6 py-3 text-sm font-semibold shadow-soft transition hover:shadow-floating disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                ) : null}
                <span>{loading ? "Creating…" : "Create group"}</span>
              </button>
            </div>
          </form>
        </section>

        {successInviteCode ? (
          <div className="rounded-[36px] border border-emerald-400/40 bg-emerald-500/10 p-6 text-sm text-emerald-100">
            Invite code ready: <strong>{successInviteCode}</strong>
          </div>
        ) : null}
      </div>
    </main>
  );
}