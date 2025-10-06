"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "../contexts";
import {
  UserIcon,
  Cog6ToothIcon as SettingsIcon,
  ArrowRightOnRectangleIcon as LogoutIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const Navigation = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    signOut, 
    getUserDisplayName, 
    getUserAvatar 
  } = useUser();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setDropdownOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActivePath = (path: string) => {
    return pathname === path;
  };

  const navLinks = [
    { href: "/papers", label: "Papers", icon: DocumentTextIcon, requireAuth: false },
    { href: "/groups", label: "Groups", icon: UserGroupIcon, requireAuth: true },
    { href: "/chat", label: "Chat", icon: ChatBubbleLeftRightIcon, requireAuth: true },
  ];

  if (isLoading) {
    return (
      <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="h-9 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="h-9 w-24 animate-pulse rounded-full bg-white/10" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-surface/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + App name */}
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-full px-2 py-1 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-soft text-base font-bold shadow-floating shadow-accent/50 transition group-hover:shadow-soft">
            AR
          </span>
          <span className="hidden text-base tracking-tight text-white/90 sm:block">
            AI Research Assistant
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => {
            if (link.requireAuth && !user) return null;
            const Icon = link.icon;
            const active = isActivePath(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-300 ease-glide ${
                  active
                    ? "bg-white/10 text-white shadow-soft"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span
                  className={`absolute inset-0 rounded-full border border-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
                    active ? "opacity-100" : ""
                  }`}
                  aria-hidden="true"
                />
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
                {active && (
                  <span className="absolute -bottom-2 left-1/2 h-1 w-1.5 -translate-x-1/2 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Profile / auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 shadow-soft transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                {getUserAvatar() ? (
                  <img
                    src={getUserAvatar()!}
                    alt="Profile"
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10 transition group-hover:ring-accent"
                  />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-white shadow-soft">
                    <UserIcon className="h-5 w-5" />
                  </span>
                )}
                <span className="hidden text-sm font-medium sm:block">
                  {getUserDisplayName()}
                </span>
                <span className="hidden text-xs text-white/60 md:block">
                  {user.email}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-soft">
                  <div className="space-y-1 border-b border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-sm font-semibold text-white/90">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-white/60">{user.email}</p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <UserIcon className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <SettingsIcon className="h-4 w-4" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-white/10 bg-white/5 px-4 py-2">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
                    >
                      <LogoutIcon className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:shadow-floating"
              >
                Join now
              </Link>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-surface/95 pb-6 md:hidden">
          <div className="px-4 pt-4">
            {user && (
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80 shadow-soft">
                <p className="text-sm font-semibold text-white/90">{getUserDisplayName()}</p>
                <p className="text-xs text-white/60">{user.email}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                if (link.requireAuth && !user) return null;
                const Icon = link.icon;
                const active = isActivePath(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                      active
                        ? "border-white/15 bg-white/12 text-white"
                        : "border-white/5 bg-white/2 text-white/70 hover:border-white/15 hover:bg-white/10 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {user ? (
              <button
                onClick={handleLogout}
                className="mt-6 w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-500/50 hover:bg-rose-500/15"
              >
                Sign out
              </button>
            ) : (
              <div className="mt-6 grid gap-3">
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/20 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-2xl bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-soft transition hover:shadow-floating"
                >
                  Join now
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;