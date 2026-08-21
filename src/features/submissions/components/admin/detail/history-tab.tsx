import { IconHistory } from "@tabler/icons-react";
import { ActivityHistoryEvent } from "@/features/submissions/components/admin/activity-history-event";
import { SectionCard } from "@/shared/ui/section-card";
import { Timeline } from "@/shared/ui/timeline";
import type { EditorActivity } from "./availability";

interface HistoryTabProps {
	activityHistory: EditorActivity[];
}

export function HistoryTab({ activityHistory }: HistoryTabProps) {
	return (
		<SectionCard icon={IconHistory} title="Activity History">
			<Timeline>
				{activityHistory.map((entry, index) => (
					<ActivityHistoryEvent
						entry={entry}
						isLast={index === activityHistory.length - 1}
						key={`${entry.activityType}-${index}`}
					/>
				))}
			</Timeline>
		</SectionCard>
	);
}
