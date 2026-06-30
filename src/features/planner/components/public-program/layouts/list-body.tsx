import type { PublicProgramSession } from "@/features/planner/server/schedule";
import { formatClockTime } from "@/features/planner/tz-datetime";
import { cn } from "@/shared/lib/utils";
import { PresentationList, SessionHeader } from "../program-primitives";
import type { TimeGroup } from "../program-types";
import type { ProgramThemeProps } from "../themes/registry";

export function ListBody({
	schedule,
	framed,
}: {
	schedule: ProgramThemeProps["schedule"];
	framed: boolean;
}) {
	const { tz, q, groups } = schedule;
	return (
		<div className={framed ? "space-y-16" : "space-y-10"}>
			{groups.map((group, gi) => (
				<TimeSlot
					key={`${new Date(group.startAt).getTime()}-${gi}`}
					group={group}
					tz={tz}
					query={q}
					framed={framed}
				/>
			))}
		</div>
	);
}

function TimeSlot({
	group,
	tz,
	query,
	framed,
}: {
	group: TimeGroup;
	tz?: string;
	query: string;
	framed: boolean;
}) {
	const isBreakOnly = group.sessions.length === 0 && group.breaks.length > 0;
	const start = formatClockTime(new Date(group.startAt), tz);
	const end = formatClockTime(new Date(group.endAt), tz);
	const dash = framed ? "—" : "–";

	if (isBreakOnly) {
		return (
			<div
				className={cn("flex items-center", framed ? "gap-3 sm:gap-6" : "gap-4")}
			>
				<span className="h-px flex-1 bg-border" />
				<div className="shrink-0 text-center">
					<p
						className={cn(
							"font-[var(--prog-font-meta)] uppercase tabular-nums text-muted-foreground",
							framed
								? "text-[10px] tracking-[0.25em] sm:text-[11px] sm:tracking-[0.3em]"
								: "text-xs tracking-wide",
						)}
					>
						{start} {dash} {end}
					</p>
					<p
						className={cn(
							"mt-1 text-foreground",
							framed
								? "font-[var(--prog-font-display)] text-xl sm:text-2xl"
								: "text-base font-medium",
						)}
					>
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
			{framed ? (
				<div className="mb-6 border-b border-border pb-3">
					<span className="font-[var(--prog-font-meta)] text-sm uppercase tracking-[0.2em] tabular-nums text-muted-foreground">
						{start} {dash} {end}
					</span>
				</div>
			) : (
				<h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary tabular-nums">
					{start} {dash} {end}
				</h2>
			)}

			<div
				className={cn(
					"grid",
					framed ? "gap-y-12 sm:gap-x-10 sm:gap-y-10" : "gap-4",
					parallel &&
						(framed
							? "md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]"
							: "lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]"),
				)}
			>
				{group.sessions.map((s) =>
					framed ? (
						<FramedCard key={s.id} session={s} tz={tz} query={query} />
					) : (
						<MinimalCard key={s.id} session={s} tz={tz} query={query} />
					),
				)}
				{group.breaks.map((b) => (
					<div
						key={b.id}
						className={cn(
							"flex items-center justify-center border border-dashed border-border text-center",
							framed
								? "px-4 py-6 sm:py-10"
								: "rounded-[var(--prog-card-radius)] px-4 py-8",
						)}
					>
						<div>
							<p
								className={cn(
									"font-[var(--prog-font-meta)] uppercase text-muted-foreground",
									framed
										? "text-[10px] tracking-[0.25em] sm:tracking-[0.3em]"
										: "text-xs tracking-wide",
								)}
							>
								{formatClockTime(new Date(b.startAt), tz)} {dash}{" "}
								{formatClockTime(new Date(b.endAt), tz)}
								{b.room && ` · ${b.room.name}`}
							</p>
							<p
								className={cn(
									"mt-1 text-foreground",
									framed
										? "font-[var(--prog-font-display)] text-xl sm:text-2xl"
										: "text-base font-medium",
								)}
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

function MinimalCard({
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
		<article className="overflow-hidden rounded-[var(--prog-card-radius)] border border-border bg-card">
			<div
				className="h-1 w-full"
				style={{ backgroundColor: trackColor ?? "var(--primary)" }}
				aria-hidden
			/>
			<div className="p-5">
				<SessionHeader
					session={session}
					query={query}
					titleClassName="mt-2 text-lg font-semibold sm:text-xl"
					metaClassName="gap-x-3 text-xs"
				/>
				<PresentationList
					session={session}
					tz={tz}
					query={query}
					className="mt-4"
				/>
			</div>
		</article>
	);
}

function FramedCard({
	session,
	tz,
	query,
}: {
	session: PublicProgramSession;
	tz?: string;
	query: string;
}) {
	return (
		<article className="relative">
			<SessionHeader
				session={session}
				query={query}
				showDot
				chairAsLabel
				className="mb-4"
				titleClassName="mt-2 text-xl font-bold sm:text-3xl"
				metaClassName="text-[10px]"
			/>
			<PresentationList session={session} tz={tz} query={query} numbered />
		</article>
	);
}
