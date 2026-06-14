import { IconHistory } from "@tabler/icons-react";
import { ActivityHistoryEvent } from "@/features/submissions/components/admin/activity-history-event";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Timeline } from "@/shared/ui/timeline";

import type { EditorActivity } from "./availability";

interface HistoryTabProps {
	activityHistory: EditorActivity[];
}

export function HistoryTab({ activityHistory }: HistoryTabProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<IconHistory className="size-4" />
					Activity History
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Timeline>
					{activityHistory.map((entry, index) => (
						<ActivityHistoryEvent
							key={`${entry.activityType}-${index}`}
							entry={entry}
							isLast={index === activityHistory.length - 1}
						/>
					))}
				</Timeline>
			</CardContent>
		</Card>
	);
}
