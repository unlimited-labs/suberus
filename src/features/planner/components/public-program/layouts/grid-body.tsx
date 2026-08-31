import { IconHandFinger } from "@tabler/icons-react";
import { useState } from "react";
import type { PublicProgramSession } from "@/features/planner/server/schedule";
import { formatClockTime } from "@/features/planner/tz-datetime";
import { cn } from "@/shared/lib/utils";
import {
	EventDetails,
	PresentationList,
	SessionHeader,
} from "../program-primitives";
import type { TimeGroup } from "../program-types";
import type { ProgramThemeProps } from "../themes/registry";

const NO_ROOM = "__no_room__";
const COL_MIN_REM = 13;
const GUTTER_REM = 4.5;
const STICKY_COL = "sticky left-0 z-10 bg-background";

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

function timeRange(group: TimeGroup, tz?: string) {
	return {
		start: formatClockTime(new Date(group.startAt), tz),
		end: formatClockTime(new Date(group.endAt), tz),
	};
}

export function GridBody({
	schedule,
}: {
	schedule: ProgramThemeProps["schedule"];
}) {
	const { tz, q, groups } = schedule;
	const cols = roomColumns(groups);
	const gridTemplateColumns = `${GUTTER_REM}rem repeat(${cols.length}, minmax(${COL_MIN_REM}rem, 1fr))`;
	const naturalRem = GUTTER_REM + cols.length * COL_MIN_REM;
	const minWidth = `${naturalRem}rem`;

	return (
		<div
			className="mx-auto px-5 sm:px-10"
			style={{ maxWidth: `max(var(--prog-max-width), ${naturalRem}rem)` }}
		>
			<div className="hidden md:block">
				<div className="fade-x overflow-x-auto">
					<div style={{ minWidth }}>
						<div
							className="border-primary grid border-b"
							style={{ gridTemplateColumns }}
						>
							<div className={STICKY_COL} />
							{cols.map((c) => (
								<div
									className="text-muted-foreground px-3 pb-2 font-(family-name:--prog-font-meta) text-[11px] tracking-[0.2em] uppercase"
									key={c.id}
								>
									{c.name}
								</div>
							))}
						</div>
						{groups.map((group, gi) => (
							<GridRow
								cols={cols}
								gridTemplateColumns={gridTemplateColumns}
								group={group}
								key={`${group.startAt}-${gi}`}
								query={q}
								tz={tz}
							/>
						))}
					</div>
				</div>
			</div>

			<MobileSwipe cols={cols} groups={groups} query={q} tz={tz} />
		</div>
	);
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
		<div className="border-border border-b">
			{hasSessions && (
				<div className="grid" style={{ gridTemplateColumns }}>
					<div
						className={cn(
							"py-4 pr-2 font-(family-name:--prog-font-meta) text-[11px] leading-tight tabular-nums",
							STICKY_COL,
						)}
					>
						<span className="text-primary block">{start}</span>
						<span className="block text-(--prog-faint)">{end}</span>
					</div>
					{cols.map((c) => {
						const sessions = group.sessions.filter(
							(s) => (s.room?.id ?? NO_ROOM) === c.id,
						);
						return (
							<div className="border-border border-l px-3 py-4" key={c.id}>
								{sessions.map((s) => (
									<SessionCell key={s.id} query={query} session={s} tz={tz} />
								))}
							</div>
						);
					})}
				</div>
			)}
			{group.breaks.length > 0 && (
				<BreakBand group={group} inset={hasSessions} tz={tz} />
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
	const events = group.breaks.filter((b) => b.kind === "EVENT");
	const plainBreaks = group.breaks.filter((b) => b.kind !== "EVENT");
	return (
		<div
			className={cn("py-3", inset && "border-t border-dashed border-border")}
		>
			{plainBreaks.length > 0 && (
				<div className="flex items-center gap-3 sm:gap-5">
					<span className="font-(family-name:--prog-font-meta) text-[10px] tracking-[0.2em] text-(--prog-faint) uppercase tabular-nums">
						{start} – {end}
					</span>
					<span className="text-muted-foreground text-base">
						{plainBreaks.map((b) => b.title).join(" · ")}
					</span>
					<span className="bg-border h-px flex-1" />
				</div>
			)}
			{events.map((ev) => (
				<div
					className="mt-2 border-l-2 border-(--primary) bg-(--prog-mark,var(--muted))/40 px-4 py-3 first:mt-0"
					data-testid={`program-event-${ev.id}`}
					key={ev.id}
				>
					<EventDetails
						item={ev}
						titleClass="text-base font-semibold"
						tz={tz}
					/>
				</div>
			))}
		</div>
	);
}

function MobileSwipe({
	groups,
	cols,
	tz,
	query,
}: {
	groups: TimeGroup[];
	cols: RoomColumn[];
	tz?: string;
	query: string;
}) {
	const [swiped, setSwiped] = useState(false);
	return (
		<div className="relative md:hidden">
			{cols.length > 1 && (
				<div
					aria-hidden
					className={cn(
						"pointer-events-none absolute top-16 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground/85 px-3 py-1.5 text-background shadow-lg transition-opacity duration-500",
						swiped && "opacity-0",
					)}
				>
					<IconHandFinger className="animate-prog-swipe-hint" size={16} />
					<span className="font-(family-name:--prog-font-meta) text-[10px] tracking-[0.2em] uppercase">
						Swipe
					</span>
				</div>
			)}
			<div
				className="fade-x -mx-5 flex snap-x snap-mandatory overflow-x-auto"
				onScroll={() => setSwiped(true)}
				style={{ scrollbarWidth: "none" }}
			>
				{cols.map((col, ci) => (
					<section className="w-full shrink-0 snap-center px-5" key={col.id}>
						<div className="border-primary mb-4 flex items-baseline gap-2 border-b pb-2">
							<span className="text-primary font-(family-name:--prog-font-meta) text-sm tracking-[0.2em] uppercase">
								{col.name}
							</span>
							{cols.length > 1 && (
								<span className="ml-auto font-(family-name:--prog-font-meta) text-[10px] text-(--prog-faint) tabular-nums">
									{ci + 1} / {cols.length}
								</span>
							)}
						</div>
						<MobileRoomTimeline
							groups={groups}
							query={query}
							roomId={col.id}
							tz={tz}
						/>
					</section>
				))}
			</div>
		</div>
	);
}

function MobileRoomTimeline({
	groups,
	roomId,
	tz,
	query,
}: {
	groups: TimeGroup[];
	roomId: string;
	tz?: string;
	query: string;
}) {
	return (
		<div className="space-y-6">
			{groups.map((group, gi) => {
				const sessions = group.sessions.filter(
					(s) => (s.room?.id ?? NO_ROOM) === roomId,
				);
				const hasBreak = group.breaks.length > 0;
				if (sessions.length === 0 && !hasBreak) return null;
				const { start, end } = timeRange(group, tz);
				return (
					<div key={`${group.startAt}-${gi}`}>
						{sessions.length > 0 && (
							<>
								<div className="mb-2 font-(family-name:--prog-font-meta) text-[11px] tracking-[0.15em] text-(--prog-faint) uppercase tabular-nums">
									{start} – {end}
								</div>
								{sessions.map((s) => (
									<SessionCell key={s.id} query={query} session={s} tz={tz} />
								))}
							</>
						)}
						{hasBreak && (
							<BreakBand group={group} inset={sessions.length > 0} tz={tz} />
						)}
					</div>
				);
			})}
		</div>
	);
}

function SessionCell({
	session,
	tz,
	query,
	showRoom = false,
}: {
	session: PublicProgramSession;
	tz?: string;
	query: string;
	showRoom?: boolean;
}) {
	return (
		<article className="not-first:mt-6">
			<SessionHeader
				chairAsLabel
				className="mb-3"
				metaClassName="text-[10px] tracking-[0.18em]"
				query={query}
				session={session}
				showDot
				showRoom={showRoom}
				titleClassName="mt-1.5 text-lg font-bold"
			/>
			<PresentationList numbered query={query} session={session} tz={tz} />
		</article>
	);
}
