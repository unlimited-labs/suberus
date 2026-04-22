import type { CalendarEvent, CalendarView } from "@ilamy/calendar";
import { useCallback, useState } from "react";
import { usePlannerSelection } from "../planner-context";
import { parseCalendarEventData } from "./parse-calendar-event-data";
import { useInvalidatePlannerQueries } from "./use-invalidate-planner-queries";

export function usePlannerCalendarHandlers(confStart: Date | null) {
	const { selectSession, selectBreak, closeCreateFromSelection } =
		usePlannerSelection();
	const invalidate = useInvalidatePlannerQueries();

	const [currentDate, setCurrentDate] = useState<Date | null>(null);
	const [currentView, setCurrentView] = useState<CalendarView>("day");
	const [calendarKey, setCalendarKey] = useState(0);

	const handleEventClick = useCallback(
		(event: CalendarEvent) => {
			const data = parseCalendarEventData(event);
			if (data?.kind === "session") selectSession(data.sessionId);
			else if (data?.kind === "break") selectBreak(data.breakId);
		},
		[selectSession, selectBreak],
	);

	const returnToConference = useCallback(() => {
		if (!confStart) return;
		setCurrentDate(confStart);
		setCalendarKey((k) => k + 1);
	}, [confStart]);

	const handleSessionCreated = useCallback(() => {
		invalidate();
		closeCreateFromSelection();
	}, [invalidate, closeCreateFromSelection]);

	return {
		currentDate,
		setCurrentDate,
		currentView,
		setCurrentView,
		calendarKey,
		handleEventClick,
		returnToConference,
		handleSessionCreated,
	};
}
