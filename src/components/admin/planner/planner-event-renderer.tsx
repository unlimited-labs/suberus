import type { CalendarEvent } from "@ilamy/calendar";
import { BreakEventCard } from "@/components/admin/planner/break-event-card";
import { SessionEventCard } from "@/components/admin/planner/session-event-card";
import { parseCalendarEventData } from "./hooks/parse-calendar-event-data";
import { usePlannerTools } from "./planner-tools-context";

export function PlannerEventRenderer({ event }: { event: CalendarEvent }) {
	const { onSubmissionDrop } = usePlannerTools();
	const data = parseCalendarEventData(event);
	if (data?.kind === "break") {
		return <BreakEventCard title={event.title} data={data} />;
	}
	if (data?.kind === "session") {
		return (
			<SessionEventCard
				title={event.title}
				data={data}
				onSubmissionDrop={(submissionId) =>
					onSubmissionDrop(data.sessionId, submissionId)
				}
			/>
		);
	}
	return null;
}
