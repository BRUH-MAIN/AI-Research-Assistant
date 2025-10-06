"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpRightIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Paper = {
  paper_id?: number;
  title: string;
  abstract?: string;
  authors?: string;
  doi?: string;
  source_url?: string;
  published_at?: string;
  tags?: string[];
};

type ArxivPaper = {
  title: string;
  abstract: string;
  authors: string;
  doi?: string;
  source_url: string;
  arxiv_id: string;
  categories: string[];
  primary_category: string;
};

type SearchResult = {
  found_in_db: boolean;
  papers: Paper[];
  arxiv_results?: ArxivPaper[];
};

export default function PaperSearchPage() {
  const [searchName, setSearchName] = useState("");
  const [searchTags, setSearchTags] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedArxivPaper, setSelectedArxivPaper] = useState<ArxivPaper | null>(null);
  const [downloadTags, setDownloadTags] = useState("");
  const [currentLimit, setCurrentLimit] = useState(100);
  const [hasMoreResults, setHasMoreResults] = useState(false);

  const handleSearch = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentLimit(100);
    }
    setError("");

    try {
      const tags = searchTags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token available. Please log in.");
      }

      const expressUrl = process.env.NEXT_PUBLIC_EXPRESS_DB_URL || "http://localhost:3001";
      const searchLimit = isLoadMore ? currentLimit + 100 : 100;

      const dbResponse = await fetch(`${expressUrl}/api/papers/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: searchName || null,
          tags: tags.length > 0 ? tags : null,
          limit: searchLimit,
        }),
      });

      if (!dbResponse.ok) {
        throw new Error("Database search failed");
      }

      const dbPapers: Paper[] = await dbResponse.json();

      if (searchName.trim() && !isLoadMore) {
        try {
          const arxivResponse = await fetch(`${expressUrl}/api/papers/search/arxiv`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              query: searchName.trim(),
              limit: 50,
            }),
          });

          if (arxivResponse.ok) {
            const arxivPapers: ArxivPaper[] = await arxivResponse.json();
            setSearchResults({
              found_in_db: true,
              papers: dbPapers,
              arxiv_results: arxivPapers,
            });
          } else {
            setSearchResults({
              found_in_db: true,
              papers: dbPapers,
            });
          }
        } catch (arxivError) {
          console.warn("ArXiv search failed:", arxivError);
          setSearchResults({
            found_in_db: true,
            papers: dbPapers,
          });
        }
      } else {
        setSearchResults((prev) => ({
          found_in_db: true,
          papers: dbPapers,
          arxiv_results: !isLoadMore ? prev?.arxiv_results : prev?.arxiv_results,
        }));
      }

      setHasMoreResults(dbPapers.length === searchLimit);
      setCurrentLimit(searchLimit);
    } catch (err) {
      setError(
        `Failed to search papers: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleDownloadFromArxiv = async (arxivPaper: ArxivPaper) => {
    setLoading(true);
    setError("");

    try {
      const tags = downloadTags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No authentication token available. Please log in.");
      }

      const expressUrl = process.env.NEXT_PUBLIC_EXPRESS_DB_URL || "http://localhost:3001";
      const response = await fetch(`${expressUrl}/api/papers/arxiv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: arxivPaper.title,
          abstract: arxivPaper.abstract,
          authors: arxivPaper.authors,
          arxiv_id: arxivPaper.arxiv_id,
          categories: arxivPaper.categories,
          source_url: arxivPaper.source_url,
          doi: arxivPaper.doi,
          custom_tags: tags.length > 0 ? tags : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save paper to database");
      }

      const savedPaper: Paper = await response.json();
      alert(`Paper "${savedPaper.title}" has been added to the database!`);
      handleSearch(false);
      setSelectedArxivPaper(null);
      setDownloadTags("");
    } catch (err) {
      setError(
        `Failed to save paper: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-glow-iris opacity-80 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 pb-24 pt-20 sm:px-10 lg:px-16">
        <header className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/60">
              Papers intelligence
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Surface seminal work, compare frameworks, and file insights without leaving your studio.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-white/70">
                Search across your curated corpus and arXiv in one motion. Save citations with bespoke tags, triage new findings, and keep provenance intact for every decision.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                <span>Deep semantic previews</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <SparklesIcon className="h-4 w-4" />
                <span>RAG-ready ingestion</span>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-soft">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Quick stats</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Database results</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {searchResults?.papers.length ?? 0}
                </p>
                <p className="text-xs text-white/60">Ready to export into RAG memory.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">arXiv previews</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {searchResults?.arxiv_results?.length ?? 0}
                </p>
                <p className="text-xs text-white/60">Fresh citations awaiting import.</p>
              </div>
            </div>
            <Link
              href="/chat"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              Continue in notebook <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        <section className="rounded-[40px] border border-white/10 bg-white/7 p-8 shadow-soft backdrop-blur-3xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Search papers</p>
              <h2 className="text-2xl font-semibold">Find, filter, and file literature in one pass.</h2>
            </div>

            {searchResults && (
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <SparklesIcon className="h-4 w-4" />
                )}
                <span>
                  {searchResults.papers.length} from database
                  {searchResults.arxiv_results?.length ? ` · ${searchResults.arxiv_results.length} from arXiv` : ""}
                </span>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <label className="group flex flex-col gap-3 rounded-3xl border border-white/12 bg-white/6 px-6 py-5 text-sm shadow-soft transition">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/60">
                <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                Paper title / authors
              </span>
              <input
                value={searchName}
                onChange={(event) => setSearchName(event.target.value)}
                placeholder="Layered diffusion for protein discovery"
                className="w-full border-none bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none"
              />
            </label>

            <label className="group flex flex-col gap-3 rounded-3xl border border-white/12 bg-white/6 px-6 py-5 text-sm shadow-soft transition">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/60">
                <SparklesIcon className="h-4 w-4" />
                Tags (comma separated)
              </span>
              <input
                value={searchTags}
                onChange={(event) => setSearchTags(event.target.value)}
                placeholder="eg. retrieval, alignment, vision"
                className="w-full border-none bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => handleSearch(false)}
              disabled={loading || (!searchName && !searchTags)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent via-accent-soft to-rose-500 px-6 py-3 text-sm font-semibold shadow-soft transition hover:shadow-floating disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                  <span>Search papers</span>
                </>
              )}
            </button>
            <p className="text-xs text-white/60">
              Filter by custom tags or keywords to surface the right corpus instantly.
            </p>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-3 rounded-3xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
            <ExclamationCircleIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {searchResults && (
          <section className="space-y-10">
            <div className="rounded-[36px] border border-white/12 bg-white/6 p-8 shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Database corpus</p>
                  <h2 className="text-2xl font-semibold">{searchResults.papers.length} results from your private vault.</h2>
                </div>
                {hasMoreResults && (
                  <button
                    type="button"
                    onClick={() => handleSearch(true)}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingMore ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
                    <span>{loadingMore ? "Loading" : "Load more"}</span>
                  </button>
                )}
              </div>

              {searchResults.papers.length > 0 ? (
                <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/3">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="text-left text-xs uppercase tracking-[0.25em] text-white/50">
                      <tr>
                        <th className="px-5 py-4">Title</th>
                        <th className="px-5 py-4">Authors</th>
                        <th className="px-5 py-4">Abstract</th>
                        <th className="px-5 py-4">Tags</th>
                        <th className="px-5 py-4">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8 text-white/80">
                      {searchResults.papers.map((paper, index) => (
                        <tr key={paper.paper_id || index} className="transition hover:bg-white/6">
                          <td className="max-w-xs px-5 py-5 align-top text-sm text-white">
                            <p className="font-medium leading-relaxed">{paper.title}</p>
                            {paper.doi ? (
                              <p className="mt-2 text-xs text-white/60">DOI: {paper.doi}</p>
                            ) : null}
                          </td>
                          <td className="max-w-xs px-5 py-5 align-top text-sm text-white/70">
                            {paper.authors || "Unknown"}
                          </td>
                          <td className="max-w-md px-5 py-5 align-top text-xs text-white/60">
                            {paper.abstract
                              ? paper.abstract.length > 160
                                ? `${paper.abstract.substring(0, 160)}…`
                                : paper.abstract
                              : "No abstract available"}
                          </td>
                          <td className="max-w-xs px-5 py-5 align-top">
                            {paper.tags && paper.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {paper.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="rounded-full bg-accent/20 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-accent"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {paper.tags.length > 3 ? (
                                  <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
                                    +{paper.tags.length - 3}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs text-white/50">No tags</span>
                            )}
                          </td>
                          <td className="px-5 py-5 align-top text-xs">
                            {paper.source_url ? (
                              <a
                                href={paper.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-white/75 transition hover:border-white/25 hover:text-white"
                              >
                                View source
                                <ArrowUpRightIcon className="h-4 w-4" />
                              </a>
                            ) : (
                              <span className="text-white/50">No source</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-white/10 bg-white/4 p-10 text-center text-sm text-white/70">
                  No papers found in the database.
                </div>
              )}
            </div>

            {searchResults.arxiv_results && searchResults.arxiv_results.length > 0 ? (
              <div className="rounded-[36px] border border-white/12 bg-white/6 p-8 shadow-soft">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">arXiv scouting</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {searchResults.arxiv_results.length} arXiv candidates ready to curate.
                </h2>

                <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/3">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="text-left text-xs uppercase tracking-[0.25em] text-white/50">
                      <tr>
                        <th className="px-5 py-4">Title</th>
                        <th className="px-5 py-4">Authors</th>
                        <th className="px-5 py-4">Abstract</th>
                        <th className="px-5 py-4">Categories</th>
                        <th className="px-5 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8 text-white/80">
                      {searchResults.arxiv_results.map((paper) => (
                        <tr key={paper.arxiv_id} className="transition hover:bg-white/6">
                          <td className="max-w-xs px-5 py-5 align-top text-sm text-white">
                            <p className="font-medium leading-relaxed">{paper.title}</p>
                            <p className="mt-2 text-xs text-emerald-300">arXiv: {paper.arxiv_id}</p>
                          </td>
                          <td className="max-w-xs px-5 py-5 align-top text-sm text-white/70">
                            {paper.authors}
                          </td>
                          <td className="max-w-md px-5 py-5 align-top text-xs text-white/60">
                            {paper.abstract.length > 160
                              ? `${paper.abstract.substring(0, 160)}…`
                              : paper.abstract}
                          </td>
                          <td className="max-w-xs px-5 py-5 align-top">
                            <div className="flex flex-wrap gap-1">
                              {paper.categories.slice(0, 3).map((category) => (
                                <span
                                  key={category}
                                  className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200"
                                >
                                  {category}
                                </span>
                              ))}
                              {paper.categories.length > 3 ? (
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
                                  +{paper.categories.length - 3}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-5 align-top text-xs">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedArxivPaper(paper)}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:bg-emerald-400/30"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                Save to DB
                              </button>
                              <a
                                href={paper.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
                              >
                                View paper <ArrowUpRightIcon className="h-4 w-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        )}
      </div>

      {selectedArxivPaper ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-6 py-10 backdrop-blur">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[36px] border border-white/10 bg-surface p-8 shadow-soft">
            <button
              type="button"
              onClick={() => {
                setSelectedArxivPaper(null);
                setDownloadTags("");
              }}
              className="absolute right-6 top-6 text-white/40 transition hover:text-white"
              aria-label="Close"
            >
              ×
            </button>

            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Save paper to database</p>
                <h3 className="text-2xl font-semibold text-white">{selectedArxivPaper.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                  <span>{selectedArxivPaper.authors}</span>
                  <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden />
                  <span>arXiv: {selectedArxivPaper.arxiv_id}</span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/6 p-5 text-sm text-white/75">
                {selectedArxivPaper.abstract}
              </div>

              <div className="space-y-3 text-sm">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Additional tags
                </label>
                <input
                  value={downloadTags}
                  onChange={(event) => setDownloadTags(event.target.value)}
                  placeholder="eg. novel-benchmark, review-later"
                  className="w-full rounded-3xl border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
                />
                <p className="text-xs text-white/60">
                  These tags complement the arXiv categories and help downstream retrieval.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleDownloadFromArxiv(selectedArxivPaper)}
                  disabled={loading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-soft transition hover:shadow-floating disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span>Save to database</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArxivPaper(null);
                    setDownloadTags("");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
