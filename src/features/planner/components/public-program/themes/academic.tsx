import { IconSearch, IconStarFilled, IconX } from "@tabler/icons-react";
import { addMinutes } from "date-fns";
import type { PublicProgramSession } from "@/features/planner/server/schedule";
import { formatClockTime } from "@/features/planner/tz-datetime";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { dayLabelParts, formatLongDate } from "../program-formatting";
import { useProgramInteraction } from "../program-interaction";
import type { TimeGroup } from "../program-types";
import type { ProgramThemeProps } from "./registry";
import { Highlight, ProgramAuthLink } from "./shared";

const MARK =
	"rounded-[1px] bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-50";
const ACCENT = "text-[#1e3a5f] dark:text-[#9db8d6]";
const SERIF = "var(--font-serif)";
const NO_ROOM = "__no_room__";

interface RoomColumn {
	id: string;
	name: string;
}

function roomColumns(groups: TimeGroup[]): RoomColumn[] {
	const seen = new Map<string, string>();
	for (const group of groups) {
		for (const session of group.sessions) {
			const id = session.room?.id ?? NO_ROOM;
			if (!seen.has(id)) seen.set(id, session.room?.name ?? "—");
		}
	}
	return [...seen.entries()]
		.map(([id, name]) => ({ id, name }))
		.sort((a, b) => {
			if (a.id === NO_ROOM) return 1;
			if (b.id === NO_ROOM) return -1;
			return a.name.localeCompare(b.name);
		});
}

export function AcademicProgram({
	settings,
	search,
	setSearch,
	activeDay,
	setActiveDay,
	schedule,
}: ProgramThemeProps) {
	const { tz, days, q, activeItems, groups } = schedule;

	return (
		<div
			data-testid="program-theme-academic"
			className="h-screen overflow-y-auto bg-[#f8f9fb] text-slate-900 selection:bg-[#1e3a5f] selection:text-[#f8f9fb] dark:bg-slate-950 dark:text-slate-100"
			style={{ fontFamily: SERIF }}
		>
			<header className="border-b border-slate-300 dark:border-slate-800">
				<div className="mx-auto max-w-6xl px-5 pt-10 pb-7 sm:px-10 sm:pt-14 sm:pb-9">
					<div className="flex items-baseline justify-between border-b border-slate-200 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
						<ProgramAuthLink className="transition-colors hover:text-[#1e3a5f] dark:hover:text-slate-200" />
						<span>
							{settings.startDate && formatLongDate(settings.startDate)}
						</span>
					</div>
					<h1
						className="mt-5 text-4xl leading-[1.05] tracking-tight break-words sm:text-5xl md:text-6xl"
						style={{ fontFamily: SERIF, fontWeight: 800 }}
					>
						{settings.name || "Conference"}
					</h1>
					{settings.subtitle && (
						<p className="mt-3 max-w-3xl text-lg leading-snug text-slate-600 sm:text-xl dark:text-slate-300">
							{settings.subtitle}
						</p>
					)}
					<div className="mt-5 flex items-center gap-4">
						<span className="h-px flex-1 bg-slate-300 dark:bg-slate-800" />
						<span
							className={cn(
								"font-mono text-[10px] uppercase tracking-[0.35em]",
								ACCENT,
							)}
						>
							Conference Programme
						</span>
						<span className="h-px flex-1 bg-slate-300 dark:bg-slate-800" />
					</div>
				</div>
			</header>

			<section className="sticky top-0 z-20 border-b border-slate-300 bg-[#f8f9fb]/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
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
												? "text-[#1e3a5f] dark:text-slate-50"
												: "text-slate-400 hover:text-slate-700 dark:text-slate-600 dark:hover:text-slate-200",
										)}
									>
										<span
											className="text-2xl leading-none tabular-nums sm:text-3xl"
											style={{ fontFamily: SERIF, fontWeight: 800 }}
										>
											{label.dayNum}
										</span>
										<span className="flex flex-col font-mono leading-tight">
											<span className="text-[10px] uppercase tracking-[0.18em]">
												{label.weekday.slice(0, 3)}
											</span>
											<span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
												{label.month.slice(0, 3)}
											</span>
										</span>
										{isActive && (
											<span className="absolute -bottom-[13px] left-0 h-[2px] w-full bg-[#1e3a5f] sm:-bottom-[17px] dark:bg-slate-200" />
										)}
									</button>
								);
							})}
						</nav>
					)}
					<div className="relative w-full sm:w-72 sm:shrink-0">
						<IconSearch
							size={13}
							className="absolute top-1/2 left-0 -translate-y-1/2 text-slate-500"
						/>
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search talks, authors, tracks…"
							className="rounded-none border-0 border-b border-slate-300 bg-transparent pr-8 pl-6 text-base shadow-none focus-visible:border-[#1e3a5f] focus-visible:ring-0 sm:text-sm dark:border-slate-700 dark:focus-visible:border-slate-100"
						/>
						{search && (
							<button
								type="button"
								onClick={() => setSearch("")}
								className="absolute top-1/2 right-1 -translate-y-1/2 p-1 text-slate-500 hover:text-[#1e3a5f] dark:hover:text-slate-100"
								aria-label="Clear search"
							>
								<IconX size={14} />
							</button>
						)}
					</div>
				</div>
			</section>

			<main className="mx-auto max-w-6xl px-5 py-8 sm:px-10 sm:py-12">
				{activeItems.length === 0 ? (
					<p className="py-16 text-center text-lg text-slate-500 sm:py-24 sm:text-xl">
						{q
							? "No entries match your search on this day."
							: "Nothing scheduled for this day."}
					</p>
				) : (
					<Timetable groups={groups} tz={tz} query={q} />
				)}
			</main>

			<footer className="border-t border-slate-300 py-8 text-center dark:border-slate-800">
				<div className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
					{settings.name || "Conference"}
				</div>
			</footer>
		</div>
	);
}

function Timetable({
	groups,
	tz,
	query,
}: {
	groups: TimeGroup[];
	tz?: string;
	query: string;
}) {
	const cols = roomColumns(groups);
	const gridTemplateColumns = `4.5rem repeat(${cols.length}, minmax(13rem, 1fr))`;
	const minWidth = `${4.5 + cols.length * 13}rem`;

	return (
		<>
			<div className="hidden md:block">
				<div className="overflow-x-auto">
					<div style={{ minWidth }}>
						<div
							className="grid border-b border-[#1e3a5f] dark:border-[#9db8d6]"
							style={{ gridTemplateColumns }}
						>
							<div />
							{cols.map((c) => (
								<div
									key={c.id}
									className="px-3 pb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400"
								>
									{c.name}
								</div>
							))}
						</div>
						{groups.map((group, gi) => (
							<GridRow
								key={`${new Date(group.startAt).getTime()}-${gi}`}
								group={group}
								cols={cols}
								gridTemplateColumns={gridTemplateColumns}
								tz={tz}
								query={query}
							/>
						))}
					</div>
				</div>
			</div>

			<div className="space-y-12 md:hidden">
				{groups.map((group, gi) => (
					<MobileGroup
						key={`${new Date(group.startAt).getTime()}-${gi}`}
						group={group}
						tz={tz}
						query={query}
					/>
				))}
			</div>
		</>
	);
}

function timeRange(group: TimeGroup, tz?: string) {
	return {
		start: formatClockTime(new Date(group.startAt), tz),
		end: formatClockTime(new Date(group.endAt), tz),
	};
}

function GridRow({
	group,
	cols,
	gridTemplateColumns,
	tz,
	query,
}: {
	group: TimeGroup;
	cols: RoomColumn[];
	gridTemplateColumns: string;
	tz?: string;
	query: string;
}) {
	const { start, end } = timeRange(group, tz);
	const hasSessions = group.sessions.length > 0;

	return (
		<div className="border-b border-slate-200 dark:border-slate-900">
			{hasSessions && (
				<div className="grid" style={{ gridTemplateColumns }}>
					<div className="py-4 pr-2 font-mono text-[11px] leading-tight text-slate-500 tabular-nums">
						<span className={cn("block", ACCENT)}>{start}</span>
						<span className="block text-slate-400">{end}</span>
					</div>
					{cols.map((c) => {
						const sessions = group.sessions.filter(
							(s) => (s.room?.id ?? NO_ROOM) === c.id,
						);
						return (
							<div
								key={c.id}
								className="border-l border-slate-200 px-3 py-4 dark:border-slate-900"
							>
								{sessions.map((s) => (
									<SessionCell key={s.id} session={s} tz={tz} query={query} />
								))}
							</div>
						);
					})}
				</div>
			)}
			{group.breaks.length > 0 && (
				<BreakBand group={group} tz={tz} inset={hasSessions} />
			)}
		</div>
	);
}

function BreakBand({
	group,
	tz,
	inset,
}: {
	group: TimeGroup;
	tz?: string;
	inset?: boolean;
}) {
	const { start, end } = timeRange(group, tz);
	return (
		<div
			className={cn(
				"flex items-center gap-3 py-3 sm:gap-5",
				inset &&
					"border-t border-dashed border-slate-200 dark:border-slate-800",
			)}
		>
			<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 tabular-nums">
				{start} – {end}
			</span>
			<span className="text-base text-slate-700 dark:text-slate-300">
				{group.breaks.map((b) => b.title).join(" · ")}
			</span>
			<span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
		</div>
	);
}

function MobileGroup({
	group,
	tz,
	query,
}: {
	group: TimeGroup;
	tz?: string;
	query: string;
}) {
	const { start, end } = timeRange(group, tz);
	const hasSessions = group.sessions.length > 0;

	if (!hasSessions) {
		return <BreakBand group={group} tz={tz} />;
	}

	return (
		<section>
			<div className="mb-4 flex items-center gap-3 border-b border-slate-300 pb-2 dark:border-slate-800">
				<span
					className={cn(
						"font-mono text-sm uppercase tracking-[0.15em] tabular-nums",
						ACCENT,
					)}
				>
					{start} – {end}
				</span>
			</div>
			<div className="space-y-8">
				{group.sessions.map((s) => (
					<SessionCell key={s.id} session={s} tz={tz} query={query} showRoom />
				))}
			</div>
			{group.breaks.length > 0 && <BreakBand group={group} tz={tz} inset />}
		</section>
	);
}

function SessionCell({
	session,
	tz,
	query,
	showRoom,
}: {
	session: PublicProgramSession;
	tz?: string;
	query: string;
	showRoom?: boolean;
}) {
	const trackColor = session.track?.color ?? undefined;

	return (
		<article className="not-first:mt-6">
			<header className="mb-3">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
					{trackColor && (
						<span
							className="inline-block size-2.5 shrink-0 rounded-full"
							style={{ backgroundColor: trackColor }}
							aria-hidden
						/>
					)}
					{session.track && <span>{session.track.name}</span>}
					{showRoom && session.room && (
						<span className="sm:ml-auto">
							<span className="mr-1.5 text-slate-400">·</span>
							{session.room.name}
						</span>
					)}
				</div>
				<h3
					className="mt-1.5 text-lg leading-tight text-slate-900 dark:text-slate-50"
					style={{ fontFamily: SERIF, fontWeight: 700 }}
				>
					<Highlight text={session.title} query={query} markClassName={MARK} />
				</h3>
				{session.chairs.length > 0 && (
					<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
						<span className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">
							{session.chairs.length > 1 ? "Chairs" : "Chair"}
						</span>{" "}
						{session.chairs
							.map((c) => [c.firstName, c.lastName].filter(Boolean).join(" "))
							.join(", ")}
					</p>
				)}
			</header>
			<PresentationList session={session} tz={tz} query={query} />
		</article>
	);
}

function PresentationList({
	session,
	tz,
	query,
}: {
	session: PublicProgramSession;
	tz?: string;
	query: string;
}) {
	const { canInteract, isFavorite, openPreview } = useProgramInteraction();

	if (session.presentations.length === 0) return null;

	return (
		<ol className="border-t border-slate-200 dark:border-slate-800">
			{session.presentations.map((p, i) => {
				const offset = session.presentations
					.slice(0, i)
					.reduce((a, prev) => a + prev.durationMin, 0);
				const presStart = addMinutes(new Date(session.startAt), offset);
				const favorite = canInteract && isFavorite(p.id);
				const open = () =>
					openPreview({
						slotId: p.id,
						submissionTitle: p.submissionTitle,
						sessionTitle: session.title,
						track: session.track,
						roomName: session.room?.name ?? null,
						startAtISO: presStart.toISOString(),
						tz,
					});
				return (
					<li
						key={p.id}
						data-testid="presentation-row"
						className={cn(
							"grid grid-cols-[2.25rem_1fr] gap-x-3 border-b border-slate-200 py-2.5 last:border-0 dark:border-slate-900",
							canInteract &&
								"cursor-pointer transition-colors hover:bg-[#1e3a5f]/[0.04] dark:hover:bg-slate-100/[0.04]",
						)}
						{...(canInteract
							? {
									role: "button",
									tabIndex: 0,
									onClick: open,
									onKeyDown: (e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											open();
										}
									},
								}
							: {})}
					>
						<div>
							<span
								className="block text-base leading-none tabular-nums text-slate-400 dark:text-slate-600"
								style={{ fontFamily: SERIF, fontWeight: 400 }}
							>
								{String(i + 1).padStart(2, "0")}
							</span>
							<span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500 tabular-nums">
								{formatClockTime(presStart, tz)}
							</span>
						</div>
						<div className="min-w-0">
							<p
								className="flex items-start gap-1.5 text-[14px] leading-snug text-slate-900 dark:text-slate-100"
								style={{ fontWeight: 600 }}
							>
								{favorite && (
									<IconStarFilled
										data-testid="favorited-star"
										className="mt-0.5 size-3.5 shrink-0 text-amber-500"
										aria-label="Favorited"
									/>
								)}
								<span>
									<Highlight
										text={p.submissionTitle}
										query={query}
										markClassName={MARK}
									/>
								</span>
							</p>
							{p.authors.length > 0 && (
								<p className="mt-0.5 text-[12px] leading-snug text-slate-600 dark:text-slate-400">
									<Highlight
										text={p.authors
											.map((a) => `${a.firstName} ${a.lastName}`)
											.join(", ")}
										query={query}
										markClassName={MARK}
									/>
								</p>
							)}
						</div>
					</li>
				);
			})}
		</ol>
	);
}
