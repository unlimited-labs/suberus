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
				<div className="overflow-x-auto">
					<div style={{ minWidth }}>
						<div
							className="grid border-b border-primary"
							style={{ gridTemplateColumns }}
						>
							<div className={STICKY_COL} />
							{cols.map((c) => (
								<div
									key={c.id}
									className="px-3 pb-2 font-[var(--prog-font-meta)] text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
								>
									{c.name}
								</div>
							))}
						</div>
						{groups.map((group, gi) => (
							<GridRow
								key={`${group.startAt}-${gi}`}
								group={group}
								cols={cols}
								gridTemplateColumns={gridTemplateColumns}
								tz={tz}
								query={q}
							/>
						))}
					</div>
				</div>
			</div>

			<MobileSwipe groups={groups} cols={cols} tz={tz} query={q} />
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
		<div className="border-b border-border">
			{hasSessions && (
				<div className="grid" style={{ gridTemplateColumns }}>
					<div
						className={cn(
							"py-4 pr-2 font-[var(--prog-font-meta)] text-[11px] leading-tight tabular-nums",
							STICKY_COL,
						)}
					>
						<span className="block text-primary">{start}</span>
						<span className="block text-[var(--prog-faint)]">{end}</span>
					</div>
					{cols.map((c) => {
						const sessions = group.sessions.filter(
							(s) => (s.room?.id ?? NO_ROOM) === c.id,
						);
						return (
							<div key={c.id} className="border-l border-border px-3 py-4">
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
	const events = group.breaks.filter((b) => b.kind === "EVENT");
	const plainBreaks = group.breaks.filter((b) => b.kind !== "EVENT");
	return (
		<div
			className={cn("py-3", inset && "border-t border-dashed border-border")}
		>
			{plainBreaks.length > 0 && (
				<div className="flex items-center gap-3 sm:gap-5">
					<span className="font-[var(--prog-font-meta)] text-[10px] uppercase tracking-[0.2em] tabular-nums text-[var(--prog-faint)]">
						{start} – {end}
					</span>
					<span className="text-base text-muted-foreground">
						{plainBreaks.map((b) => b.title).join(" · ")}
					</span>
					<span className="h-px flex-1 bg-border" />
				</div>
			)}
			{events.map((ev) => (
				<div
					key={ev.id}
					data-testid={`program-event-${ev.id}`}
					className="mt-2 border-l-2 border-[var(--primary)] bg-[var(--prog-mark,var(--muted))]/40 px-4 py-3 first:mt-0"
				>
					<EventDetails
						item={ev}
						tz={tz}
						titleClass="text-base font-semibold"
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
					<IconHandFinger size={16} className="animate-prog-swipe-hint" />
					<span className="font-[var(--prog-font-meta)] text-[10px] uppercase tracking-[0.2em]">
						Swipe
					</span>
				</div>
			)}
			<div
				onScroll={() => setSwiped(true)}
				className="-mx-5 flex snap-x snap-mandatory overflow-x-auto"
				style={{ scrollbarWidth: "none" }}
			>
				{cols.map((col, ci) => (
					<section key={col.id} className="w-full shrink-0 snap-center px-5">
						<div className="mb-4 flex items-baseline gap-2 border-b border-primary pb-2">
							<span className="font-[var(--prog-font-meta)] text-sm uppercase tracking-[0.2em] text-primary">
								{col.name}
							</span>
							{cols.length > 1 && (
								<span className="ml-auto font-[var(--prog-font-meta)] text-[10px] tabular-nums text-[var(--prog-faint)]">
									{ci + 1} / {cols.length}
								</span>
							)}
						</div>
						<MobileRoomTimeline
							groups={groups}
							roomId={col.id}
							tz={tz}
							query={query}
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
								<div className="mb-2 font-[var(--prog-font-meta)] text-[11px] uppercase tracking-[0.15em] tabular-nums text-[var(--prog-faint)]">
									{start} – {end}
								</div>
								{sessions.map((s) => (
									<SessionCell key={s.id} session={s} tz={tz} query={query} />
								))}
							</>
						)}
						{hasBreak && (
							<BreakBand group={group} tz={tz} inset={sessions.length > 0} />
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
				session={session}
				query={query}
				showDot
				showRoom={showRoom}
				chairAsLabel
				className="mb-3"
				titleClassName="mt-1.5 text-lg font-bold"
				metaClassName="text-[10px] tracking-[0.18em]"
			/>
			<PresentationList session={session} tz={tz} query={query} numbered />
		</article>
	);
}
