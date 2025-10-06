"use client";

import { useState } from "react";
import Link from "next/link";
import { IconEdit, IconHistory, IconSettings, IconSparkles } from "@tabler/icons-react";
import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import MainWindow from "../components/MainWindow";
import { cn } from "@/lib/utils";

const recentItems = [
	{
		label: "Latest session",
		href: "#",
		icon: <IconEdit className="h-5 w-5 text-white/75" />,
	},
	{
		label: "Session archive",
		href: "#",
		icon: <IconHistory className="h-5 w-5 text-white/75" />,
	},
	{
		label: "Workspace settings",
		href: "#",
		icon: <IconSettings className="h-5 w-5 text-white/75" />,
	},
];

export default function ChatWorkspace() {
	const [open, setOpen] = useState(false);

	return (
		<main className="relative min-h-screen overflow-hidden bg-surface text-white">
			<div
				className="pointer-events-none absolute inset-0 bg-glow-iris opacity-75 blur-3xl"
				aria-hidden
			/>

			<div className="relative z-10 flex min-h-screen flex-col gap-8 px-6 pb-14 pt-20 sm:px-10 lg:px-16">
				<header className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
					<div className="space-y-6">
						<span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/60">
							Dialogue studio
						</span>
						<div className="space-y-4">
							<h1 className="text-4xl font-semibold leading-tight md:text-5xl">
								Conduct rigorous conversations, orchestrate retrieval, and publish findings—without breaking flow.
							</h1>
							<p className="max-w-xl text-sm leading-relaxed text-white/70">
								Summon your assistant, replay critical turns, and switch context with one gesture. Everything is cached, structured, and ready for export into briefs or papers.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
							<span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em]">
								Live RAG orchestration
							</span>
							<span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-[0.3em]">
								Transcript memory
							</span>
						</div>
					</div>

					<div className="rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-soft">
						<p className="text-xs uppercase tracking-[0.3em] text-white/50">Session spotlight</p>
						<div className="mt-5 space-y-4">
							<div className="rounded-3xl border border-white/12 bg-white/6 p-5">
								<div className="flex items-center justify-between text-xs text-white/60">
									<span>Current dialogue</span>
									<span className="flex items-center gap-1 text-white/75">
										<IconSparkles className="h-4 w-4" />
										Active
									</span>
								</div>
								<p className="mt-3 text-sm font-medium text-white">
									Mapping multi-modal RAG patterns for paper discovery.
								</p>
								<p className="mt-2 text-xs text-white/60">
									12 highlighted turns · 4 citations pinned · Auto-summary enabled
								</p>
							</div>
							<Link
								href="/papers"
								className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/25 hover:text-white"
							>
								Launch research mode
							</Link>
						</div>
					</div>
				</header>

				<div className="flex flex-1 flex-col gap-6 md:flex-row">
					<Sidebar open={open} setOpen={setOpen} animate>
						<SidebarBody className="justify-between gap-6">
							<div className="flex flex-1 flex-col gap-6 overflow-y-auto py-4 pr-2">
								<div className="space-y-2">
									<p className="px-3 text-xs uppercase tracking-[0.3em] text-white/50">Workspace</p>
									<div className="space-y-2">
										{recentItems.map((link) => (
											<SidebarLink key={link.label} link={link} />
										))}
									</div>
								</div>

								<div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-white/70">
									<p className="text-sm font-semibold text-white">Pinned context</p>
									<p className="mt-2 text-white/70">
										Drop PDFs or note collections here to keep them one tap away for the assistant.
									</p>
								</div>

								<div className="rounded-3xl border border-white/10 bg-white/4 p-5 text-xs text-white/70">
									<p className="text-sm font-semibold text-white">Prompt vault</p>
									<p className="mt-2 text-white/70">
										Craft reusable prompts for literature critiques, experiment planning, or stakeholder updates.
									</p>
								</div>
							</div>

							<div className="rounded-3xl border border-white/10 bg-white/4 p-4 text-sm text-white/80">
								<p className="text-xs uppercase tracking-[0.3em] text-white/60">Account</p>
								<p className="mt-2 text-white">Scholar plan</p>
								<p className="text-white/60">Unlimited sessions · Priority ingestion</p>
							</div>
						</SidebarBody>
					</Sidebar>

					<div
						className={cn(
							"relative z-10 flex h-[min(900px,70vh)] flex-1 flex-col overflow-hidden rounded-[40px] border border-white/10 bg-white/4 shadow-soft backdrop-blur-3xl sm:h-full"
						)}
					>
						<MainWindow />
					</div>
				</div>
			</div>
		</main>
	);
}
