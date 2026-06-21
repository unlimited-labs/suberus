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
		<SectionCard title="Activity History" icon={IconHistory}>
			<Timeline>
				{activityHistory.map((entry, index) => (
					<ActivityHistoryEvent
						key={`${entry.activityType}-${index}`}
						entry={entry}
						isLast={index === activityHistory.length - 1}
					/>
				))}
			</Timeline>
		</SectionCard>
	);
}
