"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import GroupCard from "../components/groups/GroupCard";
import { groupService } from "../services/groupService";
import { authService, type User } from "../services/authService";
import type { Group } from "../types/types";

const GROUPS_STEP = 6;
const ROLE_FILTERS = [
  { label: "All roles", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Mentors", value: "mentor" },
  { label: "Members", value: "member" },
] as const;

type RoleFilter = (typeof ROLE_FILTERS)[number]["value"];

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [visibleCount, setVisibleCount] = useState(GROUPS_STEP);
  const [leavingGroupId, setLeavingGroupId] = useState<number | null>(null);

  const filteredGroups = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return groups.filter((group) => {
      const matchesSearch = normalizedSearch
        ? (group.name?.toLowerCase().includes(normalizedSearch) ||
            group.description?.toLowerCase().includes(normalizedSearch))
        : true;
      const matchesRole =
        roleFilter === "all" ? true : group.user_role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [groups, searchTerm, roleFilter]);

  const displayedGroups = useMemo(
    () => filteredGroups.slice(0, visibleCount),
    [filteredGroups, visibleCount]
  );

  const loadGroups = useCallback(async (userId: number) => {
    const data = await groupService.getUserGroups(userId);
    setGroups(data);
  }, []);

  useEffect(() => {
    setVisibleCount(GROUPS_STEP);
  }, [filteredGroups]);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);

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

        if (!internalId) {
          internalId = 0; // fallback to guest
        }

        if (!active) return;
        setCurrentUserId(internalId);
        await loadGroups(internalId);
      } catch (err) {
        console.error("Failed to bootstrap groups:", err);
        if (!active) return;
        setGroups([]);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your groups right now."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    const { data } = authService.onAuthStateChange(async (_event, session) => {
      if (!active) return;

      if (!session?.user) {
        setUser(null);
        setCurrentUserId(null);
        setGroups([]);
        router.push("/login");
        return;
      }

      setLoading(true);
      try {
        setUser(session.user);
        let internalId = authService.getCurrentInternalUserId();
        if (!internalId) {
          internalId = await authService.refreshInternalUserId();
        }
        if (!internalId) {
          internalId = 0;
        }
        if (!active) return;
        setCurrentUserId(internalId);
        await loadGroups(internalId);
      } catch (err) {
        console.error("Failed to refresh groups after auth change:", err);
        if (!active) return;
        setGroups([]);
        setError("We couldn’t reload your groups after signing in.");
      } finally {
        if (active) setLoading(false);
      }
    });

    subscription = data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [loadGroups, router]);

  const handleLeaveGroup = useCallback(
    async (groupId: number) => {
      if (!currentUserId) return;
      const group = groups.find(
        (entry) => (entry.group_id || entry.id) === groupId
      );
      if (!group) return;

      const confirmed = window.confirm(
        `Leave “${group.name}”? You can rejoin with a fresh invite.`
      );
      if (!confirmed) return;

      try {
        setLeavingGroupId(groupId);
        await groupService.leaveGroup(groupId, currentUserId);
        setGroups((prev) => prev.filter((entry) => (entry.group_id || entry.id) !== groupId));
      } catch (err) {
        console.error("Failed to leave group:", err);
        alert("We couldn’t remove you from that group. Please try again.");
      } finally {
        setLeavingGroupId(null);
      }
    },
    [currentUserId, groups]
  );

  const handleViewGroup = useCallback(
    (groupId: number) => {
      router.push(`/groups/${groupId}`);
    },
    [router]
  );

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + GROUPS_STEP);
  };

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-glow-iris opacity-70 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
          <p className="text-sm text-white/70">Loading your research collectives…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-glow-iris opacity-75 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-14 px-6 pb-24 pt-20 sm:px-10 lg:px-16">
        <header className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/60">
              Collaboration graph
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Curate your lab’s shared intelligence and keep every member in sync.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-white/70">
                Groups collect experiments, transcripts, and paper highlights into one living workspace. Spin up public cohorts, invite-only taskforces, or analytical guilds that stay razor-focused.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em]">
                <UserGroupIcon className="h-4 w-4" />
                Shared context memory
              </span>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em]">
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                Fine-grained roles
              </span>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-soft backdrop-blur-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Quick stats</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Active groups</p>
                <p className="mt-2 text-3xl font-semibold text-white">{groups.length}</p>
                <p className="text-xs text-white/60">Connected teams with assistant support.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Visible today</p>
                <p className="mt-2 text-3xl font-semibold text-white">{displayedGroups.length}</p>
                <p className="text-xs text-white/60">Filtered by search & role preferences.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/groups/join"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                Join group
              </Link>
              {currentUserId !== null && currentUserId >= 2 ? (
                <Link
                  href="/groups/create"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] shadow-soft transition hover:shadow-floating"
                >
                  <PlusIcon className="h-4 w-4" />
                  Create group
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                  Guest accounts can’t create groups yet
                </span>
              )}
            </div>
          </div>
        </header>

        {error ? (
          <div className="flex items-center gap-3 rounded-3xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
            <ArrowPathIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="space-y-6 rounded-[40px] border border-white/10 bg-white/7 p-8 shadow-soft backdrop-blur-3xl">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <label className="group flex flex-col gap-2 rounded-3xl border border-white/12 bg-white/6 px-6 py-5 text-sm shadow-soft transition">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/60">
                <MagnifyingGlassIcon className="h-4 w-4" />
                Search groups
              </span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, purpose, or description"
                className="w-full border-none bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none"
              />
            </label>

            <div className="rounded-3xl border border-white/12 bg-white/6 px-4 py-4 text-xs text-white/65 shadow-soft">
              <p className="px-2 text-[11px] uppercase tracking-[0.3em] text-white/50">Role filter</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ROLE_FILTERS.map((option) => {
                  const isActive = option.value === roleFilter;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRoleFilter(option.value)}
                      className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.3em] transition ${
                        isActive
                          ? "border-accent bg-accent/15 text-white"
                          : "border-white/15 bg-white/5 text-white/60 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-xs text-white/60">
            <p>
              Tip: Pair groups with shared paper collections to keep every discussion backed by citations. Pinned contexts update live across members.
            </p>
          </div>
        </section>

        <section className="space-y-8">
          {displayedGroups.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {displayedGroups.map((group) => (
                <GroupCard
                  key={group.group_id || group.id}
                  group={group}
                  showActions
                  onLeave={(groupId) => handleLeaveGroup(groupId)}
                  onView={(groupId) => handleViewGroup(groupId)}
                  leaving={leavingGroupId === (group.group_id || group.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[36px] border border-white/12 bg-white/6 p-10 text-center text-sm text-white/70">
              {groups.length === 0 ? (
                <p>Your workspace is quiet. Join or create a group to start collaborating.</p>
              ) : (
                <p>No groups match your filters. Try adjusting your search or role selection.</p>
              )}
            </div>
          )}

          {displayedGroups.length < filteredGroups.length ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Load more groups
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}