import {
	IconBook,
	IconChevronLeft,
	IconChevronRight,
	IconLayoutList,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { formatDayLabel, sameDayInTz } from "@/utils/tz-datetime";
import type { BreakEventData } from "./break-event-card";
import { MobileBreakRow } from "./mobile/mobile-break-row";
import { MobileSessionRow } from "./mobile/mobile-session-row";
import { buildPlannerItems } from "./mobile/planner-item";
import type { SessionEventData } from "./session-event-card";

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

	const allItems = useMemo(
		() => buildPlannerItems(sessions, breaks),
		[sessions, breaks],
	);

	const dayItems = useMemo(
		() => allItems.filter((i) => sameDayInTz(i.startAt, cursor, timezone)),
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
					dayItems.map((item) =>
						item.kind === "break" ? (
							<MobileBreakRow
								key={`break:${item.id}`}
								item={item}
								timezone={timezone}
								onClick={onBreakClick}
							/>
						) : (
							<MobileSessionRow
								key={`session:${item.id}`}
								item={item}
								timezone={timezone}
								onClick={onSessionClick}
							/>
						),
					)
				)}
			</div>
		</div>
	);
}

export type { BreakEventData, SessionEventData };
