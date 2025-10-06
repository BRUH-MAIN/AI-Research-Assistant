"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client with session detection disabled
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: false,
  },
});

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-white">
        <div className="h-24 w-24 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div className="pointer-events-none absolute inset-0 bg-glow-iris opacity-80 blur-3xl" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-24 px-6 pb-24 pt-24 sm:px-10 lg:px-16">
        <section className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60">
              Scholarly intelligence, human artistry
            </div>
            <div>
              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
                Shape research breakthroughs with a studio built for deliberate thinking.
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
                Curate evidence, interrogate methodology, and co-write narratives with an assistant that respects rigor. No gimmicks—just impeccable workflow design.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {user ? (
                <>
                  <Link
                    href="/chat"
                    className="rounded-full bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-6 py-3 text-sm font-semibold shadow-soft transition hover:shadow-floating"
                  >
                    Reopen your workspace
                  </Link>
                  <Link
                    href="/papers"
                    className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
                  >
                    Browse curated papers
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="rounded-full bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-6 py-3 text-sm font-semibold shadow-soft transition hover:shadow-floating"
                  >
                    Create a free account
                  </Link>
                  <Link
                    href="/papers"
                    className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
                  >
                    Explore public library
                  </Link>
                </>
              )}
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">No templates. Every workspace is personalised.</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Context memory",
                  description: "Resurrect any discussion instantly with hierarchical timelines.",
                  tone: "from-accent to-accent-soft",
                },
                {
                  title: "Paper ingestion",
                  description: "Annotate PDFs, extract claims, and reconcile citations.",
                  tone: "from-emerald-400 to-emerald-500",
                },
                {
                  title: "Experiment log",
                  description: "Document hypotheses and align your team asynchronously.",
                  tone: "from-sky-400 to-blue-600",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/6 p-4 text-sm text-white/80 shadow-soft"
                >
                  <div className={`absolute inset-0 opacity-25 blur-2xl bg-gradient-to-br ${feature.tone}`} aria-hidden />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/60">{feature.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[40px] bg-gradient-to-br from-white/10 to-white/4 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/5 shadow-soft backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 text-xs uppercase tracking-[0.3em] text-white/50">
                <span>Active session</span>
                <span>Transcript</span>
              </div>
              <div className="space-y-6 px-6 py-8">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">You asked</p>
                  <p className="rounded-3xl border border-white/10 bg-white/8 px-5 py-3 text-sm text-white/90">
                    “Contrast retrieval-augmented long-context models with hybrid BM25 pipelines for literature triage.”
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">Assistant responded</p>
                  <p className="rounded-3xl border border-white/10 bg-surface/90 px-5 py-3 text-sm leading-relaxed text-white/80">
                    “Hybrid systems offer deterministic recall with transparent ranking, while RAG adapts dynamically to narrative-driven queries. The best teams pair them, caching curated corpora and letting generative layers synthesise insights on demand.”
                  </p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/4 p-4 text-xs text-white/70">
                  <p className="font-semibold text-white">Why it matters</p>
                  <p className="mt-1 text-white/70">
                    Decision-ready context across experiments, research notes, and paper highlights—without sacrificing provenance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Workflow kits</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Purpose-built flows, ready for your research cadence.</h2>
            </div>
            <Link
              href={user ? "/chat" : "/signup"}
              className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/30 hover:text-white"
            >
              View templates
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                heading: "Literature review",
                description: "Coalesce seminal work, compare frameworks, and export annotated syntheses in minutes.",
              },
              {
                heading: "Grant preparation",
                description: "Translate datasets into compelling narratives, cite rigorously, and version every draft.",
              },
              {
                heading: "Weekly lab digest",
                description: "Summarise merged findings for stakeholders with traceable sources and follow-up actions.",
              },
              {
                heading: "Experiment triage",
                description: "Track baselines, sketch hypotheses, and let the assistant flag anomalies worth discussion.",
              },
              {
                heading: "Citations alignment",
                description: "Keep bibliographies consistent while surfacing contradictory evidence across papers.",
              },
              {
                heading: "Team briefing",
                description: "Pull talking points from papers, notes, and chats into one coherent session deck.",
              },
            ].map((card) => (
              <div
                key={card.heading}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-soft transition hover:-translate-y-1 hover:border-white/25"
              >
                <div className="absolute inset-0 opacity-0 transition group-hover:opacity-30">
                  <div className="h-full w-full bg-gradient-to-br from-accent to-accent-soft" aria-hidden />
                </div>
                <div className="relative space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Flow</p>
                  <h3 className="text-xl font-semibold">{card.heading}</h3>
                  <p className="text-sm leading-relaxed text-white/75">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}