import type { CalendarEvent } from "@ilamy/calendar";
import {
	BreakEventCard,
	type BreakEventData,
} from "@/components/admin/planner/break-event-card";
import {
	SessionEventCard,
	type SessionEventData,
} from "@/components/admin/planner/session-event-card";

type PlannerEventData = SessionEventData | BreakEventData;

interface Props {
	event: CalendarEvent;
	onSubmissionDrop: (sessionId: string, submissionId: string) => void;
}

export function PlannerEventRenderer({ event, onSubmissionDrop }: Props) {
	const data = event.data as PlannerEventData | undefined;
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
