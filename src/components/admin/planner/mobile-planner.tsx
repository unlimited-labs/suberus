import {
	IconBook,
	IconChevronLeft,
	IconChevronRight,
	IconLayoutList,
	IconUsers,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { BreakEventData } from "./break-event-card";
import type { SessionEventData } from "./session-event-card";

type SessionItem = {
	kind: "session";
	id: string;
	startAt: Date;
	endAt: Date;
	title: string;
	roomName: string | null;
	trackColor: string | null;
	trackName: string | null;
	chairs: SessionEventData["chairs"];
	presentationCount: number;
};

type BreakItem = {
	kind: "break";
	id: string;
	startAt: Date;
	endAt: Date;
	title: string;
	roomName: string | null;
};

type PlannerItem = SessionItem | BreakItem;

interface MobilePlannerProps {
	sessions: Array<{
		id: string;
		title: string;
		startAt: string | Date;
		endAt: string | Date;
		room: { name: string } | null;
		track: { name: string; color: string | null } | null;
		chairs: Array<{ firstName: string | null; lastName: string | null }>;
		presentations: unknown[];
	}>;
	breaks: Array<{
		id: string;
		title: string;
		startAt: string | Date;
		endAt: string | Date;
		room: { name: string } | null;
	}>;
	conferenceStart: Date | null;
	conferenceEnd: Date | null;
	timezone: string | undefined;
	initialDate: Date;
	onSessionClick: (id: string) => void;
	onBreakClick: (id: string) => void;
	onOpenSubmissions: () => void;
}

function sameDay(a: Date, b: Date, tz: string | undefined): boolean {
	const fmt = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	return fmt.format(a) === fmt.format(b);
}

function formatDayLabel(d: Date, tz: string | undefined): string {
	return new Intl.DateTimeFormat(undefined, {
		timeZone: tz,
		weekday: "short",
		day: "numeric",
		month: "short",
	}).format(d);
}

function formatTime(d: Date, tz: string | undefined): string {
	return new Intl.DateTimeFormat(undefined, {
		timeZone: tz,
		hour: "2-digit",
		minute: "2-digit",
	}).format(d);
}

function durationMin(start: Date, end: Date): number {
	return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function MobilePlanner({
	sessions,
	breaks,
	conferenceStart,
	conferenceEnd,
	timezone,
	initialDate,
	onSessionClick,
	onBreakClick,
	onOpenSubmissions,
}: MobilePlannerProps) {
	const [cursor, setCursor] = useState<Date>(initialDate);

	const allItems: PlannerItem[] = useMemo(() => {
		const s: PlannerItem[] = sessions.map((x) => ({
			kind: "session",
			id: x.id,
			startAt: new Date(x.startAt),
			endAt: new Date(x.endAt),
			title: x.title,
			roomName: x.room?.name ?? null,
			trackColor: x.track?.color ?? null,
			trackName: x.track?.name ?? null,
			chairs: x.chairs.map((c) => ({
				firstName: c.firstName ?? "",
				lastName: c.lastName ?? "",
			})),
			presentationCount: x.presentations.length,
		}));
		const b: PlannerItem[] = breaks.map((x) => ({
			kind: "break",
			id: x.id,
			startAt: new Date(x.startAt),
			endAt: new Date(x.endAt),
			title: x.title,
			roomName: x.room?.name ?? null,
		}));
		return [...s, ...b].sort(
			(a, b) => a.startAt.getTime() - b.startAt.getTime(),
		);
	}, [sessions, breaks]);

	const dayItems = useMemo(
		() => allItems.filter((i) => sameDay(i.startAt, cursor, timezone)),
		[allItems, cursor, timezone],
	);

	const shiftDay = (delta: number) => {
		const next = new Date(cursor);
		next.setDate(next.getDate() + delta);
		setCursor(next);
	};

	const canPrev = !conferenceStart || cursor > conferenceStart;
	const canNext = !conferenceEnd || cursor < conferenceEnd;

	return (
		<div className="flex flex-col" data-testid="mobile-planner">
			<div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-3 py-2">
				<button
					type="button"
					onClick={() => shiftDay(-1)}
					disabled={!canPrev}
					className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
					aria-label="Previous day"
				>
					<IconChevronLeft size={18} />
				</button>
				<div className="flex-1 text-center text-sm font-medium">
					{formatDayLabel(cursor, timezone)}
				</div>
				<button
					type="button"
					onClick={() => shiftDay(1)}
					disabled={!canNext}
					className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
					aria-label="Next day"
				>
					<IconChevronRight size={18} />
				</button>
				<button
					type="button"
					onClick={onOpenSubmissions}
					className="ml-1 flex items-center gap-1 rounded border px-2 py-1 text-xs"
					aria-label="Open submissions"
				>
					<IconLayoutList size={12} />
					Queue
				</button>
			</div>

			<div className="divide-y">
				{dayItems.length === 0 ? (
					<div className="flex flex-col items-center gap-2 p-8 text-center">
						<IconBook size={20} className="text-muted-foreground/40" />
						<p className="text-sm text-muted-foreground">Nothing scheduled</p>
						<p className="text-xs text-muted-foreground/70">
							Use the desktop planner to drag submissions into sessions.
						</p>
					</div>
				) : (
					dayItems.map((item) => {
						const dur = durationMin(item.startAt, item.endAt);
						if (item.kind === "break") {
							return (
								<button
									key={`break:${item.id}`}
									type="button"
									onClick={() => onBreakClick(item.id)}
									data-testid={`mobile-break-${item.id}`}
									className="flex w-full items-center gap-3 bg-muted/30 px-3 py-3 text-left hover:bg-muted/50"
								>
									<div className="w-14 shrink-0 text-center">
										<div className="text-xs font-medium tabular-nums">
											{formatTime(item.startAt, timezone)}
										</div>
										<div className="text-[10px] text-muted-foreground">
											{dur}m
										</div>
									</div>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium">{item.title}</div>
										{item.roomName && (
											<div className="text-xs text-muted-foreground">
												{item.roomName}
											</div>
										)}
									</div>
								</button>
							);
						}
						return (
							<button
								key={`session:${item.id}`}
								type="button"
								onClick={() => onSessionClick(item.id)}
								data-testid={`mobile-session-${item.id}`}
								className="flex w-full items-stretch gap-3 px-3 py-3 text-left hover:bg-muted/40"
							>
								<div className="w-14 shrink-0 text-center">
									<div className="text-xs font-medium tabular-nums">
										{formatTime(item.startAt, timezone)}
									</div>
									<div className="text-[10px] text-muted-foreground">
										{dur}m
									</div>
								</div>
								<div
									className="w-1 shrink-0 rounded-full"
									style={{
										backgroundColor: item.trackColor ?? "var(--border)",
									}}
									aria-hidden
								/>
								<div className="flex-1 min-w-0">
									<div className="line-clamp-2 text-sm font-medium">
										{item.title}
									</div>
									<div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
										{item.roomName && <span>{item.roomName}</span>}
										{item.trackName && (
											<>
												{item.roomName && <span>·</span>}
												<span>{item.trackName}</span>
											</>
										)}
										<span>·</span>
										<span>
											{item.presentationCount} talk
											{item.presentationCount === 1 ? "" : "s"}
										</span>
									</div>
									{item.chairs.length > 0 && (
										<div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
											<IconUsers size={10} />
											{item.chairs
												.map((c) => `${c.firstName} ${c.lastName}`.trim())
												.join(", ")}
										</div>
									)}
								</div>
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}

export type { BreakEventData, SessionEventData };
