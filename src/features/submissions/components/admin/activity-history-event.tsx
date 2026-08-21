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
import { lookup } from "@/shared/lib/lookup";
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

const activityConfig = {
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
} satisfies Record<
	string,
	{
		color: TimelineColor;
		icon: typeof IconCheck;
	}
>;

// SAFETY: default is a TimelineColor member; the annotation keeps the field at the union type.
const defaultConfig = { color: "default" as TimelineColor, icon: IconFileText };

interface ActivityHistoryEventProps {
	entry: ActivityHistoryEntry;
	isLast?: boolean;
}

export function ActivityHistoryEvent({
	entry,
	isLast = false,
}: ActivityHistoryEventProps) {
	const config = lookup(activityConfig, entry.activityType) ?? defaultConfig;
	const Icon = config.icon;
	const { formatDateTime } = useDateFormat();
	const label =
		lookup(activityLabels, entry.activityType) ?? entry.activityType;
	const timestamp =
		entry.createdAt instanceof Date
			? entry.createdAt
			: new Date(entry.createdAt);

	return (
		<TimelineItem isLast={isLast}>
			<TimelineIndicator
				color={config.color}
				icon={<Icon className="size-3" />}
			/>
			<TimelineContent>
				<div className="space-y-1">
					<h3 className="text-foreground font-medium">{label}</h3>
					<ActivityDetail entry={entry} />
					<div className="text-muted-foreground text-xs">
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
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const value = entry.detail[field] as string | undefined;
		if (!value) return null;
		return <p className="text-muted-foreground text-sm">{value}</p>;
	};
}

function targetUserNameDetail(entry: ActivityHistoryEntry): ReactNode {
	if (!entry.targetUserName) return null;
	return (
		<p className="text-muted-foreground text-sm">{entry.targetUserName}</p>
	);
}

const detailRenderers = {
	SUBMISSION_STATUS_CHANGED: (entry) => {
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const from = entry.detail.fromStatus as string | undefined;
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const to = entry.detail.toStatus as string | undefined;
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const reason = entry.detail.reason as string | undefined;
		return (
			<div className="space-y-1">
				{to && (
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={lookup(statusVariants, to) ?? "secondary"}>
							{lookup(statusLabels, to) ?? to}
						</Badge>
						{from && (
							<span className="text-muted-foreground text-xs">
								from {lookup(statusLabels, from) ?? from}
							</span>
						)}
					</div>
				)}
				{reason && <p className="text-muted-foreground text-sm">{reason}</p>}
			</div>
		);
	},
	REVIEW_ASSIGNED: (entry) => {
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const deadline = entry.detail.deadline as string | undefined;
		return (
			<div className="text-muted-foreground text-sm">
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
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const decision = entry.detail.decision as string | undefined;
		return (
			<div className="flex flex-wrap items-center gap-2">
				{entry.targetUserName && (
					<span className="text-muted-foreground text-sm">
						{entry.targetUserName}
					</span>
				)}
				{decision && (
					<Badge
						className={
							lookup(reviewDecisionColors, decision) ??
							"bg-muted text-muted-foreground"
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
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const decision = entry.detail.decision as string | undefined;
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const reasoning = entry.detail.reasoning as string | undefined;
		return (
			<div className="space-y-1">
				{decision && (
					<Badge variant="secondary">{decision.replace(/_/g, " ")}</Badge>
				)}
				{reasoning && (
					<p className="text-muted-foreground text-sm">{reasoning}</p>
				)}
			</div>
		);
	},
	DECISION_DESK_REJECT: noteDetail("reason"),
	DECISION_DESK_ACCEPT: noteDetail("reason"),
	DECISION_OVERRIDE: noteDetail("reasoning"),
	SUBMISSION_WITHDRAWN: noteDetail("reason"),
	SUBMISSION_RESUBMITTED: (entry) => {
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const round = entry.detail.round as number | undefined;
		if (!round) return null;
		return <p className="text-muted-foreground text-sm">Round {round}</p>;
	},
	SUBMISSION_REVISION_UPLOADED: (entry) => {
		// SAFETY: the activity type reaching this renderer carries that detail field (see DetailShapes).
		const version = entry.detail.version as number | undefined;
		if (!version) return null;
		return <p className="text-muted-foreground text-sm">Version {version}</p>;
	},
} satisfies Record<string, DetailRenderer>;

function ActivityDetail({ entry }: { entry: ActivityHistoryEntry }) {
	return lookup(detailRenderers, entry.activityType)?.(entry) ?? null;
}
