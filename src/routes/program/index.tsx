import { IconCalendar, IconSearch, IconX } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { addMinutes } from "date-fns";
import { useState } from "react";
import {
	publicConferenceInfoQueryOptions,
	publicProgramQueryOptions,
} from "@/features/planner/api/schedule";
import {
	dayLabelParts,
	formatLongDate,
} from "@/features/planner/components/public-program/program-formatting";
import type { TimeGroup } from "@/features/planner/components/public-program/program-types";
import { useProgramSchedule } from "@/features/planner/components/public-program/use-program-schedule";
import type { PublicProgramSession } from "@/features/planner/server/schedule";
import { getAppBrandingFn } from "@/features/settings/api/settings";
import { formatClockTime } from "@/shared/lib/tz-datetime";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";

export const Route = createFileRoute("/program/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(publicProgramQueryOptions()),
			context.queryClient.ensureQueryData(publicConferenceInfoQueryOptions()),
		]);
	},
	head: async () => {
		const branding = await getAppBrandingFn();
		return {
			meta: [
				{
					title: branding.conferenceName
						? `Program — ${branding.conferenceName}`
						: "Program",
				},
			],
		};
	},
	component: ProgramPage,
});

function ProgramPage() {
	const { data: program } = useSuspenseQuery(publicProgramQueryOptions());
	const { data: settings } = useSuspenseQuery(
		publicConferenceInfoQueryOptions(),
	);
	const [search, setSearch] = useState("");
	const [activeDay, setActiveDay] = useState(0);
	const { tz, days, q, activeItems, groups } = useProgramSchedule({
		program,
		settings,
		search,
		activeDay,
	});

	if (!program) return <EmptyState />;

	return (
		<div
			className="h-screen overflow-y-auto bg-[#f5f1e8] text-stone-900 selection:bg-stone-900 selection:text-[#f5f1e8] dark:bg-stone-950 dark:text-stone-100"
			style={{ fontFamily: "var(--font-futuristic-body)" }}
		>
			{/* Masthead */}
			<header className="border-b-[3px] border-double border-stone-900 dark:border-stone-300">
				<div className="mx-auto max-w-6xl px-5 pt-8 pb-6 sm:px-10 sm:pt-12 sm:pb-8">
					<div className="flex items-baseline justify-end border-b border-stone-400 pb-2 dark:border-stone-700">
						<span
							className="text-[9px] uppercase tracking-[0.25em] text-stone-600 sm:text-[10px] sm:tracking-[0.3em] dark:text-stone-400"
							style={{ fontFamily: "var(--font-sans)" }}
						>
							{settings.startDate && formatLongDate(settings.startDate)}
						</span>
					</div>
					<h1
						className="mt-4 text-4xl leading-[0.95] tracking-tight break-words sm:mt-6 sm:text-6xl sm:leading-[0.9] md:text-7xl"
						style={{
							fontFamily: "var(--font-editorial-display)",
							fontWeight: 800,
						}}
					>
						{settings.name || "Conference"}
					</h1>
					{settings.subtitle && (
						<p
							className="mt-3 max-w-3xl text-lg italic text-stone-700 sm:mt-4 sm:text-2xl dark:text-stone-300"
							style={{ fontFamily: "var(--font-futuristic-body)" }}
						>
							{settings.subtitle}
						</p>
					)}
					<div className="mt-4 flex items-center gap-3 sm:mt-6 sm:gap-4">
						<span className="h-px flex-1 bg-stone-400 dark:bg-stone-700" />
						<span
							className="text-[10px] uppercase tracking-[0.3em] text-stone-500 sm:text-[11px] sm:tracking-[0.4em]"
							style={{ fontFamily: "var(--font-sans)" }}
						>
							◆ Programme ◆
						</span>
						<span className="h-px flex-1 bg-stone-400 dark:bg-stone-700" />
					</div>
				</div>
			</header>

			{/* Day nav + search */}
			<section className="sticky top-0 z-20 border-b border-stone-300 bg-[#f5f1e8]/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
				<div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-10 sm:py-4">
					{days.length > 0 && (
						<nav
							className="-mx-5 flex items-stretch gap-0 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0"
							aria-label="Select day"
							style={{ scrollbarWidth: "none" }}
						>
							{days.map((day, i) => {
								const label = dayLabelParts(day);
								const isActive = activeDay === i;
								return (
									<button
										key={day.toISOString()}
										type="button"
										onClick={() => setActiveDay(i)}
										className={cn(
											"group relative flex shrink-0 items-baseline gap-2 px-3 py-1.5 text-left whitespace-nowrap transition-colors first:pl-0 sm:py-2",
											isActive
												? "text-stone-900 dark:text-stone-50"
												: "text-stone-400 hover:text-stone-700 dark:text-stone-600 dark:hover:text-stone-200",
										)}
									>
										<span
											className="text-2xl leading-none tabular-nums sm:text-3xl"
											style={{
												fontFamily: "var(--font-editorial-display)",
												fontWeight: 800,
											}}
										>
											{label.dayNum}
										</span>
										<span className="flex flex-col leading-tight">
											<span
												className="text-[10px] uppercase tracking-[0.2em]"
												style={{ fontFamily: "var(--font-sans)" }}
											>
												{label.weekday.slice(0, 3)}
											</span>
											<span
												className="text-[10px] uppercase tracking-[0.15em] text-stone-500"
												style={{ fontFamily: "var(--font-sans)" }}
											>
												{label.month.slice(0, 3)}
											</span>
										</span>
										{isActive && (
											<span className="absolute -bottom-[13px] left-0 h-[3px] w-full bg-stone-900 sm:-bottom-[17px] dark:bg-stone-50" />
										)}
									</button>
								);
							})}
						</nav>
					)}
					<div className="relative w-full sm:w-72 sm:shrink-0">
						<IconSearch
							size={13}
							className="absolute top-1/2 left-0 -translate-y-1/2 text-stone-500"
						/>
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search talks, authors, tracks…"
							className="rounded-none border-0 border-b border-stone-400 bg-transparent pr-8 pl-6 text-base italic shadow-none focus-visible:border-stone-900 focus-visible:ring-0 sm:text-sm dark:border-stone-700 dark:focus-visible:border-stone-100"
							style={{ fontFamily: "var(--font-futuristic-body)" }}
						/>
						{search && (
							<button
								type="button"
								onClick={() => setSearch("")}
								className="absolute top-1/2 right-1 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
								aria-label="Clear search"
							>
								<IconX size={14} />
							</button>
						)}
					</div>
				</div>
			</section>

			{/* Body */}
			<main className="mx-auto max-w-6xl px-5 py-8 sm:px-10 sm:py-12">
				{activeItems.length === 0 ? (
					<p
						className="py-16 text-center text-xl italic text-stone-500 sm:py-24 sm:text-2xl"
						style={{ fontFamily: "var(--font-editorial-display)" }}
					>
						{q
							? "— Nothing matches your search on this day —"
							: "— Nothing scheduled for this day —"}
					</p>
				) : (
					<div className="space-y-16">
						{groups.map((group, gi) => (
							<TimeSlot
								key={`${new Date(group.startAt).getTime()}-${gi}`}
								group={group}
								tz={tz}
								query={q}
							/>
						))}
					</div>
				)}
			</main>

			<footer className="border-t-[3px] border-double border-stone-900 py-8 text-center dark:border-stone-300">
				<div
					className="text-[10px] uppercase tracking-[0.4em] text-stone-500"
					style={{ fontFamily: "var(--font-sans)" }}
				>
					— Fin —
				</div>
			</footer>
		</div>
	);
}

function TimeSlot({
	group,
	tz,
	query,
}: {
	group: TimeGroup;
	tz?: string;
	query: string;
}) {
	const isBreakOnly = group.sessions.length === 0 && group.breaks.length > 0;

	if (isBreakOnly) {
		return (
			<div className="flex items-center gap-3 sm:gap-6">
				<span className="h-px flex-1 bg-stone-400 dark:bg-stone-700" />
				<div className="shrink-0 text-center">
					<p
						className="text-[10px] uppercase tracking-[0.25em] text-stone-500 tabular-nums sm:text-[11px] sm:tracking-[0.3em]"
						style={{ fontFamily: "var(--font-sans)" }}
					>
						{formatClockTime(new Date(group.startAt), tz)} —{" "}
						{formatClockTime(new Date(group.endAt), tz)}
					</p>
					<p
						className="mt-1 text-xl italic text-stone-700 sm:text-2xl dark:text-stone-300"
						style={{ fontFamily: "var(--font-editorial-display)" }}
					>
						{group.breaks.map((b) => b.title).join(" · ")}
					</p>
				</div>
				<span className="h-px flex-1 bg-stone-400 dark:bg-stone-700" />
			</div>
		);
	}

	const parallel = group.sessions.length > 1;

	return (
		<section>
			{/* Slot header */}
			<div className="mb-6 border-b border-stone-300 pb-3 dark:border-stone-800">
				<span
					className="text-sm uppercase tracking-[0.2em] text-stone-600 tabular-nums dark:text-stone-400"
					style={{ fontFamily: "var(--font-sans)" }}
				>
					{formatClockTime(new Date(group.startAt), tz)} —{" "}
					{formatClockTime(new Date(group.endAt), tz)}
				</span>
			</div>

			<div
				className={cn(
					"grid gap-y-12 sm:gap-y-10 sm:gap-x-10",
					parallel
						? "md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]"
						: "",
				)}
			>
				{group.sessions.map((s) => (
					<SessionArticle key={s.id} session={s} tz={tz} query={query} />
				))}
				{/* Room-specific breaks shown alongside sessions at this time */}
				{group.breaks.map((b) => (
					<div
						key={b.id}
						className="flex items-center justify-center rounded-none border border-dashed border-stone-400 px-4 py-6 text-center sm:py-10 dark:border-stone-700"
					>
						<div>
							<p
								className="text-[10px] uppercase tracking-[0.25em] text-stone-500 sm:tracking-[0.3em]"
								style={{ fontFamily: "var(--font-sans)" }}
							>
								{formatClockTime(new Date(b.startAt), tz)} —{" "}
								{formatClockTime(new Date(b.endAt), tz)}
								{b.room && ` · ${b.room.name}`}
							</p>
							<p
								className="mt-2 text-xl italic text-stone-700 sm:text-2xl dark:text-stone-300"
								style={{ fontFamily: "var(--font-editorial-display)" }}
							>
								{b.title}
							</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function SessionArticle({
	session,
	tz,
	query,
}: {
	session: PublicProgramSession;
	tz?: string;
	query: string;
}) {
	const trackColor = session.track?.color ?? undefined;

	return (
		<article className="relative">
			{/* Session header */}
			<header className="mb-4">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					{trackColor && (
						<span
							className="inline-block size-2.5 shrink-0 rounded-full"
							style={{ backgroundColor: trackColor }}
							aria-hidden
						/>
					)}
					{session.track && (
						<span
							className="text-[10px] uppercase tracking-[0.25em] text-stone-600 dark:text-stone-400"
							style={{ fontFamily: "var(--font-sans)" }}
						>
							{session.track.name}
						</span>
					)}
					{session.room && (
						<span
							className="text-[10px] uppercase tracking-[0.25em] text-stone-600 sm:ml-auto dark:text-stone-400"
							style={{ fontFamily: "var(--font-sans)" }}
						>
							<span className="mr-1.5 text-stone-400 sm:hidden">·</span>
							{session.room.name}
						</span>
					)}
				</div>
				<h3
					className="mt-2 text-xl leading-tight text-stone-900 sm:text-3xl dark:text-stone-50"
					style={{
						fontFamily: "var(--font-editorial-display)",
						fontWeight: 700,
					}}
				>
					<Highlight text={session.title} query={query} />
				</h3>
				{session.chairs.length > 0 && (
					<p
						className="mt-1 text-sm italic text-stone-600 dark:text-stone-400"
						style={{ fontFamily: "var(--font-futuristic-body)" }}
					>
						<span
							className="not-italic uppercase tracking-[0.15em] text-stone-500"
							style={{ fontFamily: "var(--font-sans)", fontSize: 9 }}
						>
							{session.chairs.length > 1 ? "Chairs" : "Chair"}
						</span>{" "}
						{session.chairs
							.map((c) => [c.firstName, c.lastName].filter(Boolean).join(" "))
							.join(", ")}
					</p>
				)}
			</header>

			{/* Presentations — numbered list, always visible in full */}
			{session.presentations.length > 0 && (
				<ol className="border-t border-stone-300 dark:border-stone-800">
					{session.presentations.map((p, i) => {
						const offset = session.presentations
							.slice(0, i)
							.reduce((a, prev) => a + prev.durationMin, 0);
						const presStart = addMinutes(new Date(session.startAt), offset);
						return (
							<li
								key={p.id}
								className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-stone-200 py-3 last:border-0 dark:border-stone-900"
							>
								<div>
									<span
										className="block text-2xl leading-none tabular-nums text-stone-400 dark:text-stone-600"
										style={{
											fontFamily: "var(--font-editorial-display)",
											fontWeight: 300,
										}}
									>
										{String(i + 1).padStart(2, "0")}
									</span>
									<span
										className="mt-1 block text-[10px] uppercase tracking-[0.15em] text-stone-500 tabular-nums"
										style={{ fontFamily: "var(--font-sans)" }}
									>
										{formatClockTime(presStart, tz)}
									</span>
								</div>
								<div className="min-w-0">
									<p
										className="text-[15px] leading-snug text-stone-900 dark:text-stone-100"
										style={{
											fontFamily: "var(--font-futuristic-body)",
											fontWeight: 600,
										}}
									>
										<Highlight text={p.submissionTitle} query={query} />
									</p>
									{p.authors.length > 0 && (
										<p
											className="mt-1 text-[13px] italic leading-snug text-stone-600 dark:text-stone-400"
											style={{ fontFamily: "var(--font-futuristic-body)" }}
										>
											<Highlight
												text={p.authors
													.map((a) => `${a.firstName} ${a.lastName}`)
													.join(", ")}
												query={query}
											/>
										</p>
									)}
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</article>
	);
}

function Highlight({ text, query }: { text: string; query: string }) {
	if (!query) return <>{text}</>;
	const idx = text.toLowerCase().indexOf(query);
	if (idx < 0) return <>{text}</>;
	return (
		<>
			{text.slice(0, idx)}
			<mark className="bg-yellow-200/80 px-0.5 text-stone-900 dark:bg-yellow-500/40 dark:text-stone-50">
				{text.slice(idx, idx + query.length)}
			</mark>
			{text.slice(idx + query.length)}
		</>
	);
}

function EmptyState() {
	return (
		<div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f5f1e8] p-8 text-center dark:bg-stone-950">
			<IconCalendar className="size-12 text-stone-400" />
			<p
				className="text-2xl italic text-stone-700 dark:text-stone-300"
				style={{ fontFamily: "var(--font-editorial-display)" }}
			>
				Programme not published yet
			</p>
			<p
				className="text-sm uppercase tracking-[0.25em] text-stone-500"
				style={{ fontFamily: "var(--font-sans)" }}
			>
				— check back soon —
			</p>
		</div>
	);
}
