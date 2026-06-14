import {
	IconAlertTriangle,
	IconArrowsExchange,
	IconCheck,
	IconEdit,
	IconEye,
	IconFileText,
	IconFileUpload,
	IconGavel,
	IconRefresh,
	IconSend,
	IconUserPlus,
	IconX,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
	TimelineContent,
	TimelineIndicator,
	TimelineItem,
} from "@/components/ui/timeline";
import {
	reviewDecisionColors,
	statusLabels,
	statusVariants,
} from "@/features/submissions/labels";
import { activityLabels } from "@/lib/labels/activity";
import { useDateFormat } from "@/shared/hooks/use-date-format";
export type ActivityHistoryEntry = {
	activityType: string;
	createdAt: Date;
	performerName: string | null;
	targetUserName: string | null;
	detail: Record<string, string | number | boolean | null>;
};

type TimelineColor = Parameters<typeof TimelineIndicator>[0]["color"];

const activityConfig: Record<
	string,
	{
		color: TimelineColor;
		icon: typeof IconCheck;
	}
> = {
	SUBMISSION_CREATED: { color: "blue", icon: IconEdit },
	SUBMISSION_DRAFT_SUBMITTED: { color: "blue", icon: IconSend },
	SUBMISSION_STATUS_CHANGED: { color: "blue", icon: IconRefresh },
	SUBMISSION_WITHDRAWN: { color: "gray", icon: IconX },
	SUBMISSION_RESUBMITTED: { color: "blue", icon: IconRefresh },
	SUBMISSION_REVISION_UPLOADED: { color: "blue", icon: IconFileUpload },
	SUBMISSION_TRACK_CHANGED: { color: "purple", icon: IconArrowsExchange },
	REVIEW_ASSIGNED: { color: "orange", icon: IconUserPlus },
	REVIEW_SUBMITTED: { color: "green", icon: IconEye },
	REVIEW_CANCELLED: { color: "gray", icon: IconX },
	REVIEW_OVERDUE: { color: "red", icon: IconAlertTriangle },
	DECISION_SUBMITTED: { color: "purple", icon: IconGavel },
	DECISION_DESK_REJECT: { color: "red", icon: IconGavel },
	DECISION_DESK_ACCEPT: { color: "green", icon: IconCheck },
	DECISION_OVERRIDE: { color: "yellow", icon: IconGavel },
};

const defaultConfig = { color: "default" as TimelineColor, icon: IconFileText };

interface ActivityHistoryEventProps {
	entry: ActivityHistoryEntry;
	isLast?: boolean;
}

export function ActivityHistoryEvent({
	entry,
	isLast = false,
}: ActivityHistoryEventProps) {
	const config = activityConfig[entry.activityType] ?? defaultConfig;
	const Icon = config.icon;
	const { formatDateTime } = useDateFormat();
	const label = activityLabels[entry.activityType] ?? entry.activityType;
	const timestamp =
		typeof entry.createdAt === "string"
			? new Date(entry.createdAt)
			: entry.createdAt;

	return (
		<TimelineItem isLast={isLast}>
			<TimelineIndicator
				color={config.color}
				icon={<Icon className="size-3" />}
			/>
			<TimelineContent>
				<div className="space-y-1">
					<h3 className="font-medium text-foreground">{label}</h3>
					<ActivityDetail entry={entry} />
					<div className="text-xs text-muted-foreground">
						{formatDateTime(timestamp)}
						{entry.performerName && ` — ${entry.performerName}`}
					</div>
				</div>
			</TimelineContent>
		</TimelineItem>
	);
}

function ActivityDetail({ entry }: { entry: ActivityHistoryEntry }) {
	const d = entry.detail;

	switch (entry.activityType) {
		case "SUBMISSION_STATUS_CHANGED": {
			const from = d.fromStatus as string | undefined;
			const to = d.toStatus as string | undefined;
			const reason = d.reason as string | undefined;
			return (
				<div className="space-y-1">
					{to && (
						<div className="flex items-center gap-2 flex-wrap">
							<Badge
								variant={
									statusVariants[to as keyof typeof statusVariants] ??
									"secondary"
								}
							>
								{statusLabels[to as keyof typeof statusLabels] ?? to}
							</Badge>
							{from && (
								<span className="text-xs text-muted-foreground">
									from {statusLabels[from as keyof typeof statusLabels] ?? from}
								</span>
							)}
						</div>
					)}
					{reason && <p className="text-sm text-muted-foreground">{reason}</p>}
				</div>
			);
		}
		case "REVIEW_ASSIGNED": {
			const deadline = d.deadline as string | undefined;
			return (
				<div className="text-sm text-muted-foreground">
					{entry.targetUserName && <span>{entry.targetUserName}</span>}
					{deadline && (
						<span>
							{entry.targetUserName ? " · " : ""}Deadline: {deadline}
						</span>
					)}
				</div>
			);
		}
		case "REVIEW_SUBMITTED": {
			const decision = d.decision as string | undefined;
			return (
				<div className="flex items-center gap-2 flex-wrap">
					{entry.targetUserName && (
						<span className="text-sm text-muted-foreground">
							{entry.targetUserName}
						</span>
					)}
					{decision && (
						<Badge
							className={
								reviewDecisionColors[decision] ?? "bg-gray-100 text-gray-800"
							}
						>
							{decision.replace(/_/g, " ")}
						</Badge>
					)}
				</div>
			);
		}
		case "REVIEW_CANCELLED":
		case "REVIEW_OVERDUE": {
			if (!entry.targetUserName) return null;
			return (
				<p className="text-sm text-muted-foreground">{entry.targetUserName}</p>
			);
		}
		case "DECISION_SUBMITTED": {
			const decision = d.decision as string | undefined;
			const reasoning = d.reasoning as string | undefined;
			return (
				<div className="space-y-1">
					{decision && (
						<Badge variant="secondary">{decision.replace(/_/g, " ")}</Badge>
					)}
					{reasoning && (
						<p className="text-sm text-muted-foreground">{reasoning}</p>
					)}
				</div>
			);
		}
		case "DECISION_DESK_REJECT":
		case "DECISION_DESK_ACCEPT": {
			const reason = d.reason as string | undefined;
			if (!reason) return null;
			return <p className="text-sm text-muted-foreground">{reason}</p>;
		}
		case "DECISION_OVERRIDE": {
			const reasoning = d.reasoning as string | undefined;
			if (!reasoning) return null;
			return <p className="text-sm text-muted-foreground">{reasoning}</p>;
		}
		case "SUBMISSION_WITHDRAWN": {
			const reason = d.reason as string | undefined;
			if (!reason) return null;
			return <p className="text-sm text-muted-foreground">{reason}</p>;
		}
		case "SUBMISSION_RESUBMITTED": {
			const round = d.round as number | undefined;
			if (!round) return null;
			return <p className="text-sm text-muted-foreground">Round {round}</p>;
		}
		case "SUBMISSION_REVISION_UPLOADED": {
			const version = d.version as number | undefined;
			if (!version) return null;
			return <p className="text-sm text-muted-foreground">Version {version}</p>;
		}
		default:
			return null;
	}
}
