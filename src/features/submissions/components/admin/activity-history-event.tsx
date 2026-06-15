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
import type { ReactNode } from "react";
import { activityLabels } from "@/features/activity-log/labels";
import {
	reviewDecisionColors,
	statusLabels,
	statusVariants,
} from "@/features/submissions/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import {
	TimelineContent,
	TimelineIndicator,
	TimelineItem,
} from "@/shared/ui/timeline";
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

type DetailRenderer = (entry: ActivityHistoryEntry) => ReactNode;

/** Plain paragraph from a single `detail` string field, or null when absent. */
function noteDetail(field: string): DetailRenderer {
	return (entry) => {
		const value = entry.detail[field] as string | undefined;
		if (!value) return null;
		return <p className="text-sm text-muted-foreground">{value}</p>;
	};
}

function targetUserNameDetail(entry: ActivityHistoryEntry): ReactNode {
	if (!entry.targetUserName) return null;
	return (
		<p className="text-sm text-muted-foreground">{entry.targetUserName}</p>
	);
}

const detailRenderers: Record<string, DetailRenderer> = {
	SUBMISSION_STATUS_CHANGED: (entry) => {
		const from = entry.detail.fromStatus as string | undefined;
		const to = entry.detail.toStatus as string | undefined;
		const reason = entry.detail.reason as string | undefined;
		return (
			<div className="space-y-1">
				{to && (
					<div className="flex items-center gap-2 flex-wrap">
						<Badge
							variant={
								statusVariants[to as keyof typeof statusVariants] ?? "secondary"
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
	},
	REVIEW_ASSIGNED: (entry) => {
		const deadline = entry.detail.deadline as string | undefined;
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
	},
	REVIEW_SUBMITTED: (entry) => {
		const decision = entry.detail.decision as string | undefined;
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
	},
	REVIEW_CANCELLED: targetUserNameDetail,
	REVIEW_OVERDUE: targetUserNameDetail,
	DECISION_SUBMITTED: (entry) => {
		const decision = entry.detail.decision as string | undefined;
		const reasoning = entry.detail.reasoning as string | undefined;
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
	},
	DECISION_DESK_REJECT: noteDetail("reason"),
	DECISION_DESK_ACCEPT: noteDetail("reason"),
	DECISION_OVERRIDE: noteDetail("reasoning"),
	SUBMISSION_WITHDRAWN: noteDetail("reason"),
	SUBMISSION_RESUBMITTED: (entry) => {
		const round = entry.detail.round as number | undefined;
		if (!round) return null;
		return <p className="text-sm text-muted-foreground">Round {round}</p>;
	},
	SUBMISSION_REVISION_UPLOADED: (entry) => {
		const version = entry.detail.version as number | undefined;
		if (!version) return null;
		return <p className="text-sm text-muted-foreground">Version {version}</p>;
	},
};

function ActivityDetail({ entry }: { entry: ActivityHistoryEntry }) {
	return detailRenderers[entry.activityType]?.(entry) ?? null;
}
