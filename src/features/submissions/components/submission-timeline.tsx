import { compareAsc } from "date-fns";
import type { UserSubmissionStatusHistory } from "@/features/submissions/api/submissions";
import { SectionCard } from "@/shared/ui/section-card";
import { Timeline } from "@/shared/ui/timeline";
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
	const sortedHistory = [...statusHistory].sort((a, b) =>
		compareAsc(new Date(a.timestamp), new Date(b.timestamp)),
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
		<SectionCard variant="elevated" title="Submission History">
			<Timeline>
				{sortedHistory.map((event, index) => (
					<TimelineEvent
						key={event.id}
						event={event}
						isLast={index === sortedHistory.length - 1}
					/>
				))}
			</Timeline>
		</SectionCard>
	);
}
