import type { CalendarEvent } from "@ilamy/calendar";
import { BreakEventCard } from "@/features/planner/components/break-event-card";
import { SessionEventCard } from "@/features/planner/components/session-event-card";
import { parseCalendarEventData } from "./hooks/parse-calendar-event-data";
import { usePlannerTools } from "./planner-tools-context";

export function PlannerEventRenderer({ event }: { event: CalendarEvent }) {
	const { onSubmissionDrop } = usePlannerTools();
	const data = parseCalendarEventData(event);
	if (data?.kind === "break") {
		return <BreakEventCard data={data} title={event.title} />;
	}
	if (data?.kind === "session") {
		return (
			<SessionEventCard
				data={data}
				onSubmissionDrop={(submissionId) =>
					onSubmissionDrop(data.sessionId, submissionId)
				}
				title={event.title}
			/>
		);
	}
	return null;
}
