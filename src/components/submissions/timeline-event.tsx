import {
	IconAlertCircle,
	IconCheck,
	IconClock,
	IconEdit,
	IconFile,
	IconRefresh,
	IconSend,
	IconX,
} from "@tabler/icons-react";
import {
	TimelineContent,
	TimelineIndicator,
	TimelineItem,
} from "@/components/ui/timeline";
import type { SubmissionStatus } from "@/generated/prisma/enums";
import type { UserSubmissionStatusHistory } from "@/utils/submissions.functions";

interface TimelineEventProps {
	event: UserSubmissionStatusHistory;
	isLast?: boolean;
}

const statusConfig: Record<
	SubmissionStatus,
	{
		color:
			| "blue"
			| "orange"
			| "purple"
			| "green"
			| "red"
			| "yellow"
			| "gray"
			| "default";
		icon: typeof IconCheck;
		label: string;
	}
> = {
	DRAFT: {
		color: "blue",
		icon: IconEdit,
		label: "Draft created",
	},
	SUBMITTED: {
		color: "blue",
		icon: IconSend,
		label: "Submitted",
	},
	UNDER_REVIEW: {
		color: "orange",
		icon: IconClock,
		label: "Under review",
	},
	REVIEWS_COMPLETE: {
		color: "purple",
		icon: IconFile,
		label: "Reviews complete",
	},
	AWAITING_DECISION: {
		color: "purple",
		icon: IconClock,
		label: "Awaiting decision",
	},
	REVISE_REQUIRED: {
		color: "yellow",
		icon: IconAlertCircle,
		label: "Revisions required",
	},
	RESUBMITTED: {
		color: "blue",
		icon: IconRefresh,
		label: "Resubmitted",
	},
	ACCEPTED: {
		color: "green",
		icon: IconCheck,
		label: "Accepted",
	},
	CONDITIONALLY_ACCEPTED: {
		color: "green",
		icon: IconCheck,
		label: "Conditionally accepted",
	},
	REJECTED: {
		color: "red",
		icon: IconX,
		label: "Rejected",
	},
	WITHDRAWN: {
		color: "gray",
		icon: IconX,
		label: "Withdrawn",
	},
};

export function TimelineEvent({ event, isLast = false }: TimelineEventProps) {
	const config = statusConfig[event.status];
	const Icon = config.icon;
	const timestamp =
		typeof event.timestamp === "string"
			? new Date(event.timestamp)
			: event.timestamp;

	return (
		<TimelineItem isLast={isLast}>
			<TimelineIndicator
				color={config.color}
				icon={<Icon className="size-3" />}
			/>
			<TimelineContent>
				<div className="space-y-1">
					<h3 className="font-medium text-foreground">{config.label}</h3>
					<p className="text-sm text-muted-foreground">
						{timestamp.toLocaleDateString("en-US", {
							day: "2-digit",
							month: "short",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
					<p className="text-xs text-muted-foreground">{event.triggeredBy}</p>
					{event.metadata?.comment && (
						<p className="text-xs text-muted-foreground/80 mt-1 italic">
							{event.metadata.comment}
						</p>
					)}
				</div>
			</TimelineContent>
		</TimelineItem>
	);
}
