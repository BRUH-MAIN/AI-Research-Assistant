"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, ClockIcon } from "@heroicons/react/24/outline";
import { blogPosts } from "../posts";

export default function BlogArticlePage() {
  const params = useParams<{ productID: string }>();
  const router = useRouter();

  const post = useMemo(
    () => blogPosts.find((entry) => entry.slug === params.productID),
    [params.productID]
  );

  if (!post) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-glow-iris opacity-70 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Article missing</p>
          <h1 className="text-3xl font-semibold md:text-4xl">We haven't published that field note yet.</h1>
          <button
            type="button"
            onClick={() => router.push("/blog")}
            className="rounded-full border border-white/15 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            Return to all articles
          </button>
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
      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-12 px-6 pb-24 pt-20 sm:px-10">
        <button
          type="button"
          onClick={() => router.push("/blog")}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to insights
        </button>

        <header className="rounded-[40px] border border-white/10 bg-white/6 p-8 shadow-soft backdrop-blur-3xl">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
              {post.tags.join(" · ")}
            </span>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">{post.title}</h1>
            <p className="text-sm leading-relaxed text-white/70">{post.summary}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
              <ClockIcon className="h-4 w-4" />
              <span>{post.readingTime}</span>
              <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden />
              <span>{post.publishedAt}</span>
            </div>
          </div>
        </header>

        <article className="space-y-12 text-sm leading-relaxed text-white/75">
          {post.sections.map((section) => (
            <section
              key={section.heading}
              className="rounded-[32px] border border-white/12 bg-white/5 p-8 shadow-soft"
            >
              <h2 className="text-xl font-semibold text-white">{section.heading}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-white/70">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.highlight ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/8 px-5 py-4 text-xs text-white/65">
                  {section.highlight}
                </div>
              ) : null}
            </section>
          ))}
        </article>

        <div className="grid gap-8 rounded-[40px] border border-white/10 bg-white/6 p-8 shadow-soft sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Key takeaways</p>
            <ul className="space-y-3 text-sm text-white/75">
              {post.takeaways.map((takeaway) => (
                <li key={takeaway} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent" aria-hidden />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Recommended next steps</p>
            <ul className="space-y-3 text-sm text-white/75">
              {post.recommendedActions.map((action) => (
                <li key={action} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
