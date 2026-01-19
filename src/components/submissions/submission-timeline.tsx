import { Timeline } from "@/components/ui/timeline";
import { TimelineEvent } from "./timeline-event";
import type { MockStatusHistory } from "@/lib/mock-data/submissions";

interface SubmissionTimelineProps {
	statusHistory: MockStatusHistory[];
	compact?: boolean;
}

export function SubmissionTimeline({
	statusHistory,
	compact = false,
}: SubmissionTimelineProps) {
	// Sort history chronologically (oldest first)
	const sortedHistory = [...statusHistory].sort(
		(a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
	);

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
