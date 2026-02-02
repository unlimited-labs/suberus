import { Timeline } from "@/components/ui/timeline";
import type { UserSubmissionStatusHistory } from "@/utils/submissions.functions";
import { TimelineEvent } from "./timeline-event";

interface SubmissionTimelineProps {
	statusHistory: UserSubmissionStatusHistory[];
	compact?: boolean;
}

export function SubmissionTimeline({
	statusHistory,
	compact = false,
}: SubmissionTimelineProps) {
	// Sort history chronologically (oldest first)
	const sortedHistory = [...statusHistory].sort((a, b) => {
		const aTime = typeof a.timestamp === "string" ? new Date(a.timestamp).getTime() : a.timestamp.getTime();
		const bTime = typeof b.timestamp === "string" ? new Date(b.timestamp).getTime() : b.timestamp.getTime();
		return aTime - bTime;
	});

	if (compact) {
		return (
			<Timeline>
				{sortedHistory.map((event, index) => (
					<TimelineEvent
						key={event.id}
						event={event}
						isLast={index === sortedHistory.length - 1}
					/>
				))}
			</Timeline>
		);
	}

	return (
		<div className="rounded-2xl bg-card shadow-2xl border p-8">
			<h2 className="text-xl font-semibold text-foreground mb-6">Submission History</h2>
			<Timeline>
				{sortedHistory.map((event, index) => (
					<TimelineEvent
						key={event.id}
						event={event}
						isLast={index === sortedHistory.length - 1}
					/>
				))}
			</Timeline>
		</div>
	);
}
