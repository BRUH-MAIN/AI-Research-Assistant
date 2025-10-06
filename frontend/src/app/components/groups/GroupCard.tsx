"use client";

import {
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  EyeIcon,
  GlobeAltIcon,
  LockClosedIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { Group } from "../../types/types";

interface GroupCardProps {
  group: Group;
  showActions?: boolean;
  onLeave?: (groupId: number) => void | Promise<void>;
  onView?: (groupId: number) => void | Promise<void>;
  leaving?: boolean;
}

const roleBadgeClasses: Record<string, string> = {
  admin: "border-rose-300/40 bg-rose-400/20 text-rose-100",
  mentor: "border-sky-300/40 bg-sky-400/20 text-sky-100",
  member: "border-emerald-300/40 bg-emerald-400/20 text-emerald-100",
};

export default function GroupCard({
  group,
  showActions = true,
  onLeave,
  onView,
  leaving = false,
}: GroupCardProps) {
  const groupId = group.group_id || group.id;
  const memberCount = group.member_count || 0;
  const isPublic = Boolean(group.is_public);
  const inviteCode = group.invite_code || "";

  const formattedDate = group.created_at
    ? new Date(group.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const roleClass = roleBadgeClasses[group.user_role ?? ""] ?? "border-white/15 bg-white/5 text-white/70";

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
    } catch (error) {
      console.error("Failed to copy invite code:", error);
    }
  };

  return (
    <article className="group relative overflow-hidden rounded-[32px] border border-white/12 bg-white/5 p-6 shadow-soft transition hover:-translate-y-1">
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-20"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(99,102,241,0.6), rgba(236,72,153,0.25) 45%, rgba(255,255,255,0))",
        }}
        aria-hidden
      />

      <div className="relative flex h-full flex-col gap-6 text-sm">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                <UserGroupIcon className="h-5 w-5 text-white" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-white">{group.name}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                  {isPublic ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1">
                      <GlobeAltIcon className="h-3.5 w-3.5" />
                      Public cohort
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1">
                      <LockClosedIcon className="h-3.5 w-3.5" />
                      Private collective
                    </span>
                  )}
                  {group.user_role ? (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${roleClass}`}>
                      {group.user_role}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {group.description ? (
              <p className="max-w-lg text-sm leading-relaxed text-white/70">
                {group.description}
              </p>
            ) : null}
          </div>

          {showActions ? (
            <div className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em]">
              <button
                type="button"
                onClick={() => onView?.(groupId)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-white/75 transition hover:border-white/25 hover:text-white"
              >
                <EyeIcon className="h-4 w-4" />
                View
              </button>
              {group.user_role !== "admin" ? (
                <button
                  type="button"
                  onClick={() => onLeave?.(groupId)}
                  disabled={leaving}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300/40 bg-rose-500/20 px-4 py-2 text-rose-100 transition hover:border-rose-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {leaving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-transparent" />
                  ) : null}
                  Leave
                </button>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="flex flex-wrap gap-4 text-xs text-white/60">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2">
            <UsersIcon className="h-4 w-4" />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </div>
          {formattedDate ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2">
              <CalendarIcon className="h-4 w-4" />
              Created {formattedDate}
            </div>
          ) : null}
          {group.creator_name ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2">
              Founder
              <span className="text-white/80">{group.creator_name}</span>
            </div>
          ) : null}
        </div>

        {(group.user_role === "admin" || group.user_role === "mentor") && inviteCode ? (
          <div className="rounded-3xl border border-white/10 bg-white/6 p-4 text-xs text-white/70">
            <p className="uppercase tracking-[0.3em] text-white/50">Invite code</p>
            <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-white/12 bg-white/4 px-4 py-3">
              <code className="text-sm text-white">{inviteCode}</code>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
              >
                <ClipboardDocumentCheckIcon className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}