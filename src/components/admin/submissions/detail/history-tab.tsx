import { IconHistory } from "@tabler/icons-react";

import { ActivityHistoryEvent } from "@/components/admin/submissions/activity-history-event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline } from "@/components/ui/timeline";

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
