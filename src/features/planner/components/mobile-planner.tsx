import {
	IconBook,
	IconChevronLeft,
	IconChevronRight,
	IconLayoutList,
} from "@tabler/icons-react";
import { addDays } from "date-fns";
import { useState } from "react";
import { formatDayLabel, sameDayInTz } from "@/features/planner/tz-datetime";
import { MobileBreakRow } from "./mobile/mobile-break-row";
import { MobileSessionRow } from "./mobile/mobile-session-row";
import { buildPlannerItems } from "./mobile/planner-item";
import { usePlannerSelection } from "./planner-context";
import type { PlannerBreak, PlannerSession } from "./types";

interface MobilePlannerProps {
	sessions: PlannerSession[];
	breaks: PlannerBreak[];
	conferenceStart: Date | null;
	conferenceEnd: Date | null;
	timezone: string | undefined;
	initialDate: Date;
}

export function MobilePlanner({
	sessions,
	breaks,
	conferenceStart,
	conferenceEnd,
	timezone,
	initialDate,
}: MobilePlannerProps) {
	const { selectSession, selectBreak, setMobileQueueOpen } =
		usePlannerSelection();
	const [cursor, setCursor] = useState<Date>(initialDate);

	const allItems = buildPlannerItems(sessions, breaks);

	const dayItems = allItems.filter((i) =>
		sameDayInTz(i.startAt, cursor, timezone),
	);

	const shiftDay = (delta: number) => {
		setCursor(addDays(cursor, delta));
	};

	const canPrev = !conferenceStart || cursor > conferenceStart;
	const canNext = !conferenceEnd || cursor < conferenceEnd;

	return (
		<div className="flex flex-col" data-testid="mobile-planner">
			<div className="bg-background sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-2">
				<button
					aria-label="Previous day"
					className="text-muted-foreground hover:bg-muted rounded p-1 disabled:opacity-30"
					disabled={!canPrev}
					onClick={() => shiftDay(-1)}
					type="button"
				>
					<IconChevronLeft size={18} />
				</button>
				<div className="flex-1 text-center text-sm font-medium">
					{formatDayLabel(cursor, timezone)}
				</div>
				<button
					aria-label="Next day"
					className="text-muted-foreground hover:bg-muted rounded p-1 disabled:opacity-30"
					disabled={!canNext}
					onClick={() => shiftDay(1)}
					type="button"
				>
					<IconChevronRight size={18} />
				</button>
				<button
					aria-label="Open submissions"
					className="ml-1 flex items-center gap-1 rounded border px-2 py-1 text-xs"
					onClick={() => setMobileQueueOpen(true)}
					type="button"
				>
					<IconLayoutList size={12} />
					Queue
				</button>
			</div>

			<div className="divide-y">
				{dayItems.length === 0 ? (
					<div className="flex flex-col items-center gap-2 p-8 text-center">
						<IconBook className="text-muted-foreground/40" size={20} />
						<p className="text-muted-foreground text-sm">Nothing scheduled</p>
						<p className="text-muted-foreground/70 text-xs">
							Use the desktop planner to drag submissions into sessions.
						</p>
					</div>
				) : (
					dayItems.map((item) =>
						item.kind === "break" ? (
							<MobileBreakRow
								item={item}
								key={`break:${item.id}`}
								onClick={selectBreak}
								timezone={timezone}
							/>
						) : (
							<MobileSessionRow
								item={item}
								key={`session:${item.id}`}
								onClick={selectSession}
								timezone={timezone}
							/>
						),
					)
				)}
			</div>
		</div>
	);
}
