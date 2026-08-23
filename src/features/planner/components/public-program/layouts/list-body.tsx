import type {
	PublicProgramBreak,
	PublicProgramSession,
} from "@/features/planner/server/schedule";
import { formatClockTime } from "@/features/planner/tz-datetime";
import { cn } from "@/shared/lib/utils";
import {
	EventDetails,
	PresentationList,
	SessionHeader,
} from "../program-primitives";
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
					framed={framed}
					group={group}
					key={`${group.startAt}-${gi}`}
					query={q}
					tz={tz}
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
	const start = formatClockTime(new Date(group.startAt), tz);
	const end = formatClockTime(new Date(group.endAt), tz);
	const dash = framed ? "—" : "–";

	const hasEvent = group.breaks.some((b) => b.kind === "EVENT");
	if (group.sessions.length === 0 && group.breaks.length > 0 && !hasEvent) {
		return (
			<BreakOnlyRow
				dash={dash}
				end={end}
				framed={framed}
				group={group}
				start={start}
			/>
		);
	}

	const parallel = group.sessions.length > 1;

	return (
		<section>
			<SlotHeading dash={dash} end={end} framed={framed} start={start} />
			<div
				className={cn(
					"grid",
					framed ? "gap-y-12 sm:gap-10" : "gap-4",
					parallel &&
						(framed
							? "md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]"
							: "lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]"),
				)}
			>
				{group.sessions.map((s) =>
					framed ? (
						<FramedCard key={s.id} query={query} session={s} tz={tz} />
					) : (
						<MinimalCard key={s.id} query={query} session={s} tz={tz} />
					),
				)}
				{group.breaks.map((b) => (
					<BreakCard dash={dash} framed={framed} item={b} key={b.id} tz={tz} />
				))}
			</div>
		</section>
	);
}

function SlotHeading({
	start,
	end,
	dash,
	framed,
}: {
	start: string;
	end: string;
	dash: string;
	framed: boolean;
}) {
	if (framed) {
		return (
			<div className="border-border mb-6 border-b pb-3">
				<span className="text-muted-foreground font-(family-name:--prog-font-meta) text-sm tracking-[0.2em] uppercase tabular-nums">
					{start} {dash} {end}
				</span>
			</div>
		);
	}
	return (
		<h2 className="text-primary mb-4 text-sm font-semibold tracking-wide uppercase tabular-nums">
			{start} {dash} {end}
		</h2>
	);
}

function BreakOnlyRow({
	group,
	start,
	end,
	dash,
	framed,
}: {
	group: TimeGroup;
	start: string;
	end: string;
	dash: string;
	framed: boolean;
}) {
	return (
		<div
			className={cn("flex items-center", framed ? "gap-3 sm:gap-6" : "gap-4")}
		>
			<span className="bg-border h-px flex-1" />
			<div className="shrink-0 text-center">
				<p
					className={cn(
						"font-(family-name:--prog-font-meta) uppercase tabular-nums text-muted-foreground",
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
							? "font-(family-name:--prog-font-display) text-xl sm:text-2xl"
							: "text-base font-medium",
					)}
				>
					{group.breaks.map((b) => b.title).join(" · ")}
				</p>
			</div>
			<span className="bg-border h-px flex-1" />
		</div>
	);
}

function BreakCard({
	item,
	tz,
	dash,
	framed,
}: {
	item: PublicProgramBreak;
	tz?: string;
	dash: string;
	framed: boolean;
}) {
	if (item.kind === "EVENT") {
		return <EventCard framed={framed} item={item} tz={tz} />;
	}
	return (
		<div
			className={cn(
				"flex items-center justify-center border border-dashed border-border text-center",
				framed
					? "px-4 py-6 sm:py-10"
					: "rounded-(--prog-card-radius) px-4 py-8",
			)}
		>
			<div>
				<p
					className={cn(
						"font-(family-name:--prog-font-meta) uppercase text-muted-foreground",
						framed
							? "text-[10px] tracking-[0.25em] sm:tracking-[0.3em]"
							: "text-xs tracking-wide",
					)}
				>
					{formatClockTime(new Date(item.startAt), tz)} {dash}{" "}
					{formatClockTime(new Date(item.endAt), tz)}
					{item.room && ` · ${item.room.name}`}
				</p>
				<p
					className={cn(
						"mt-1 text-foreground",
						framed
							? "font-(family-name:--prog-font-display) text-xl sm:text-2xl"
							: "text-base font-medium",
					)}
				>
					{item.title}
				</p>
			</div>
		</div>
	);
}

function EventCard({
	item,
	tz,
	framed,
}: {
	item: PublicProgramBreak;
	tz?: string;
	framed: boolean;
}) {
	return (
		<div
			className={cn(
				"border-l-2 border-(--primary) bg-(--prog-mark,var(--muted))/40 p-5",
				framed ? "" : "rounded-(--prog-card-radius)",
			)}
			data-testid={`program-event-${item.id}`}
		>
			<EventDetails
				item={item}
				titleClass={
					framed
						? "font-(family-name:--prog-font-display) text-xl sm:text-2xl"
						: "text-lg font-semibold"
				}
				tz={tz}
			/>
		</div>
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
		<article className="border-border bg-card overflow-hidden rounded-(--prog-card-radius) border">
			<div
				aria-hidden
				className="h-1 w-full"
				style={{ backgroundColor: trackColor ?? "var(--primary)" }}
			/>
			<div className="p-5">
				<SessionHeader
					metaClassName="gap-x-3 text-xs"
					query={query}
					session={session}
					titleClassName="mt-2 text-lg font-semibold sm:text-xl"
				/>
				<PresentationList
					className="mt-4"
					query={query}
					session={session}
					tz={tz}
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
				chairAsLabel
				className="mb-4"
				metaClassName="text-[10px]"
				query={query}
				session={session}
				showDot
				titleClassName="mt-2 text-xl font-bold sm:text-3xl"
			/>
			<PresentationList numbered query={query} session={session} tz={tz} />
		</article>
	);
}
