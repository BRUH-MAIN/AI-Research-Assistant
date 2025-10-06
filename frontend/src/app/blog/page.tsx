"use client";

import Link from "next/link";
import { ArrowUpRightIcon, BookOpenIcon, ClockIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { blogPosts } from "./posts";

export default function BlogPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-glow-iris opacity-80 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 pb-24 pt-20 sm:px-10 lg:px-16">
        <header className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/60">
              Field notes
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Dispatches on crafting retrieval-first research rituals.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-white/70">
                We translate production learnings into actionable playbooks. No hype—just systems thinking, interface craft, and trustworthy automation for teams who interrogate evidence for a living.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em]">
                <SparklesIcon className="h-4 w-4" />
                Research ops
              </span>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em]">
                <BookOpenIcon className="h-4 w-4" />
                Design systems
              </span>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-soft backdrop-blur-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Latest insight</p>
            <div className="mt-5 space-y-4">
              <h2 className="text-xl font-semibold text-white">{blogPosts[0]?.title}</h2>
              <p className="text-sm leading-relaxed text-white/70">{blogPosts[0]?.summary}</p>
              <div className="flex items-center gap-3 text-xs text-white/60">
                <ClockIcon className="h-4 w-4" />
                <span>{blogPosts[0]?.readingTime}</span>
                <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden />
                <span>{blogPosts[0]?.publishedAt}</span>
              </div>
              <Link
                href={`/blog/${blogPosts[0]?.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Read article <ArrowUpRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">All posts</p>
              <h2 className="text-2xl font-semibold">Research-backed stories for practitioners.</h2>
            </div>
            <span className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
              Updated monthly
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {blogPosts.map((post) => (
              <article
                key={post.slug}
                className="group relative overflow-hidden rounded-[32px] border border-white/12 bg-white/5 p-6 shadow-soft transition hover:-translate-y-1"
              >
                <div
                  className={`absolute inset-0 opacity-0 transition group-hover:opacity-20 bg-gradient-to-br ${post.gradient}`}
                  aria-hidden
                />
                <div className="relative flex h-full flex-col gap-4">
                  <header className="space-y-3">
                    <div className="flex items-center gap-3 text-xs text-white/60">
                      <ClockIcon className="h-4 w-4" />
                      <span>{post.readingTime}</span>
                      <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden />
                      <span>{post.publishedAt}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white">{post.title}</h3>
                    <p className="text-sm leading-relaxed text-white/70">{post.summary}</p>
                  </header>

                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.25em] text-white/55">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/15 bg-white/6 px-3 py-1"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
                  >
                    Read more <ArrowUpRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
