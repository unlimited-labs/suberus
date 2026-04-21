import type { CalendarEvent } from "@ilamy/calendar";
import type { BreakEventData } from "../break-event-card";
import type { SessionEventData } from "../session-event-card";

export type PlannerEventData = SessionEventData | BreakEventData;

export function parseCalendarEventData(
	event: CalendarEvent,
): PlannerEventData | null {
	const data = event.data as Partial<PlannerEventData> | undefined;
	if (data?.kind === "session" || data?.kind === "break") {
		return data as PlannerEventData;
	}
	return null;
}
