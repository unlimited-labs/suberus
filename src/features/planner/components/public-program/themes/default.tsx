import { IconSearch, IconX } from "@tabler/icons-react";
import { addMinutes } from "date-fns";
import type { PublicProgramSession } from "@/features/planner/server/schedule";
import { formatClockTime } from "@/features/planner/tz-datetime";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { dayLabelParts, formatLongDate } from "../program-formatting";
import type { TimeGroup } from "../program-types";
import type { ProgramThemeProps } from "./registry";
import { Highlight } from "./shared";

const MARK = "rounded bg-primary/20 text-foreground";

export function DefaultProgram({
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
			data-testid="program-theme-default"
			className="h-screen overflow-y-auto bg-background text-foreground"
		>
			<header className="border-b border-border">
				<div className="mx-auto max-w-5xl px-5 pt-10 pb-6 sm:px-8 sm:pt-14">
					{settings.startDate && (
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
							{formatLongDate(settings.startDate)}
						</p>
					)}
					<h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
						{settings.name || "Conference"}
					</h1>
					{settings.subtitle && (
						<p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
							{settings.subtitle}
						</p>
					)}
				</div>
			</header>

			<div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
				<div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
					{days.length > 0 && (
						<nav
							className="-mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0"
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
											"flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors",
											isActive
												? "border-primary bg-primary text-primary-foreground"
												: "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
										)}
									>
										<span className="text-base font-semibold tabular-nums">
											{label.dayNum}
										</span>
										<span className="text-xs uppercase tracking-wide">
											{label.weekday.slice(0, 3)} {label.month.slice(0, 3)}
										</span>
									</button>
								);
							})}
						</nav>
					)}
					<div className="relative w-full sm:w-72 sm:shrink-0">
						<IconSearch
							size={15}
							className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search talks, authors, tracks…"
							className="pr-9 pl-9"
						/>
						{search && (
							<button
								type="button"
								onClick={() => setSearch("")}
								className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
								aria-label="Clear search"
							>
								<IconX size={15} />
							</button>
						)}
					</div>
				</div>
			</div>

			<main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
				{activeItems.length === 0 ? (
					<p className="py-20 text-center text-lg text-muted-foreground">
						{q
							? "Nothing matches your search on this day."
							: "Nothing scheduled for this day."}
					</p>
				) : (
					<div className="space-y-10">
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
	const timeLabel = `${formatClockTime(new Date(group.startAt), tz)} – ${formatClockTime(new Date(group.endAt), tz)}`;

	if (isBreakOnly) {
		return (
			<div className="flex items-center gap-4">
				<span className="h-px flex-1 bg-border" />
				<div className="shrink-0 text-center">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
						{timeLabel}
					</p>
					<p className="mt-1 text-base font-medium text-foreground">
						{group.breaks.map((b) => b.title).join(" · ")}
					</p>
				</div>
				<span className="h-px flex-1 bg-border" />
			</div>
		);
	}

	const parallel = group.sessions.length > 1;

	return (
		<section>
			<h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary tabular-nums">
				{timeLabel}
			</h2>
			<div
				className={cn(
					"grid gap-4",
					parallel ? "lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]" : "",
				)}
			>
				{group.sessions.map((s) => (
					<SessionCard key={s.id} session={s} tz={tz} query={query} />
				))}
				{group.breaks.map((b) => (
					<div
						key={b.id}
						className="flex items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center"
					>
						<div>
							<p className="text-xs uppercase tracking-wide text-muted-foreground">
								{formatClockTime(new Date(b.startAt), tz)} –{" "}
								{formatClockTime(new Date(b.endAt), tz)}
								{b.room && ` · ${b.room.name}`}
							</p>
							<p className="mt-1 text-base font-medium text-foreground">
								{b.title}
							</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function SessionCard({
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
		<article className="overflow-hidden rounded-xl border border-border bg-card">
			<div
				className="h-1 w-full"
				style={{ backgroundColor: trackColor ?? "var(--primary)" }}
				aria-hidden
			/>
			<div className="p-5">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-wide text-muted-foreground">
					{session.track && <span>{session.track.name}</span>}
					{session.room && (
						<span className="sm:ml-auto">{session.room.name}</span>
					)}
				</div>
				<h3 className="mt-2 text-lg font-semibold leading-tight text-foreground sm:text-xl">
					<Highlight text={session.title} query={query} markClassName={MARK} />
				</h3>
				{session.chairs.length > 0 && (
					<p className="mt-1 text-sm text-muted-foreground">
						<span className="font-medium">
							{session.chairs.length > 1 ? "Chairs: " : "Chair: "}
						</span>
						{session.chairs
							.map((c) => [c.firstName, c.lastName].filter(Boolean).join(" "))
							.join(", ")}
					</p>
				)}

				{session.presentations.length > 0 && (
					<ol className="mt-4 divide-y divide-border border-t border-border">
						{session.presentations.map((p, i) => {
							const offset = session.presentations
								.slice(0, i)
								.reduce((a, prev) => a + prev.durationMin, 0);
							const presStart = addMinutes(new Date(session.startAt), offset);
							return (
								<li
									key={p.id}
									className="grid grid-cols-[3.5rem_1fr] gap-x-3 py-3"
								>
									<span className="text-sm font-medium text-muted-foreground tabular-nums">
										{formatClockTime(presStart, tz)}
									</span>
									<div className="min-w-0">
										<p className="text-sm font-medium leading-snug text-foreground">
											<Highlight
												text={p.submissionTitle}
												query={query}
												markClassName={MARK}
											/>
										</p>
										{p.authors.length > 0 && (
											<p className="mt-0.5 text-sm leading-snug text-muted-foreground">
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
				)}
			</div>
		</article>
	);
}
