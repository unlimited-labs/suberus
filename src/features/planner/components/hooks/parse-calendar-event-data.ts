import type { CalendarEvent } from "@ilamy/calendar";
import type { BreakEventData } from "../break-event-card";
import type { SessionEventData } from "../session-event-card";

export type PlannerEventData = SessionEventData | BreakEventData;

export function parseCalendarEventData(
	event: CalendarEvent,
): PlannerEventData | null {
	// SAFETY: our own calendar events carry this payload; foreign ones fail the kind check.
	const data = event.data as Partial<PlannerEventData> | undefined;
	if (data?.kind === "session" || data?.kind === "break") {
		// SAFETY: the kind check above establishes the full payload.
		return data as PlannerEventData;
	}
	return null;
}
