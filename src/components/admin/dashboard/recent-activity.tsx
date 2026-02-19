import {
	IconCash,
	IconEye,
	IconFileText,
	IconGavel,
	IconLoader2,
	IconMail,
	IconUser,
	IconUserMinus,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMoreActivity } from "@/utils/admin-dashboard.functions";
import type { AdminDashboardMetrics } from "@/utils/admin-dashboard.server";

type ActivityEvent = AdminDashboardMetrics["recentActivity"][number];

const activityLabels: Record<string, string> = {
	USER_REGISTERED: "User registered",
	USER_EMAIL_VERIFIED: "Email verified",
	USER_PROFILE_UPDATED: "Profile updated",
	USER_PASSWORD_CHANGED: "Password changed",
	USER_ROLE_CHANGED: "Role changed",
	USER_TOGGLED_ACTIVE: "User status changed",
	USER_DELETED: "User deleted",
	SUBMISSION_CREATED: "Submission created",
	SUBMISSION_DRAFT_SUBMITTED: "Draft submitted",
	SUBMISSION_STATUS_CHANGED: "Status changed",
	SUBMISSION_WITHDRAWN: "Submission withdrawn",
	SUBMISSION_RESUBMITTED: "Submission resubmitted",
	SUBMISSION_TRACK_CHANGED: "Track changed",
	REVIEW_ASSIGNED: "Reviewer assigned",
	REVIEW_STARTED: "Review started",
	REVIEW_SUBMITTED: "Review submitted",
	REVIEW_CANCELLED: "Review cancelled",
	REVIEW_OVERDUE: "Review overdue",
	DECISION_SUBMITTED: "Decision submitted",
	DECISION_DESK_REJECT: "Desk rejected",
	DECISION_OVERRIDE: "Decision overridden",
	INVITATION_CREATED: "Invitation sent",
	INVITATION_USED: "Invitation accepted",
	INVITATION_CANCELLED: "Invitation cancelled",
	FEE_MARKED_PAID: "Fee marked paid",
	FEE_MARKED_UNPAID: "Fee marked unpaid",
};

function getEventIcon(type: string) {
	if (type === "USER_DELETED") return IconUserMinus;
	if (type.startsWith("USER_")) return IconUser;
	if (type.startsWith("SUBMISSION_")) return IconFileText;
	if (type.startsWith("REVIEW_")) return IconEye;
	if (type.startsWith("DECISION_")) return IconGavel;
	if (type.startsWith("INVITATION_")) return IconMail;
	if (type.startsWith("FEE_")) return IconCash;
	return IconFileText;
}

function getEventColor(type: string): string {
	if (type === "USER_DELETED") return "text-red-600";
	if (type === "SUBMISSION_WITHDRAWN") return "text-gray-600";
	if (type === "REVIEW_OVERDUE") return "text-orange-600";
	if (type === "REVIEW_CANCELLED") return "text-gray-600";
	if (type === "DECISION_DESK_REJECT") return "text-red-600";
	if (type === "FEE_MARKED_UNPAID") return "text-red-600";

	if (type.startsWith("USER_")) return "text-indigo-600";
	if (type.startsWith("SUBMISSION_")) return "text-blue-600";
	if (type.startsWith("REVIEW_")) return "text-yellow-600";
	if (type.startsWith("DECISION_")) return "text-purple-600";
	if (type.startsWith("INVITATION_")) return "text-teal-600";
	if (type.startsWith("FEE_")) return "text-emerald-600";

	return "text-gray-600";
}

function getEventDescription(event: ActivityEvent): string | null {
	const detail = event.detail;
	if (!detail) return null;

	switch (event.type) {
		case "SUBMISSION_STATUS_CHANGED":
			if (detail.fromStatus && detail.toStatus) {
				return `${String(detail.fromStatus)} → ${String(detail.toStatus)}`;
			}
			return null;
		case "USER_ROLE_CHANGED":
			if (detail.fromRole && detail.toRole) {
				return `${String(detail.fromRole)} → ${String(detail.toRole)}`;
			}
			return null;
		case "DECISION_SUBMITTED":
			if (detail.decision) {
				return String(detail.decision);
			}
			return null;
		case "FEE_MARKED_PAID":
			if (detail.amount != null) {
				return `${String(detail.amount)} ${detail.currency ? String(detail.currency) : ""}`.trim();
			}
			return null;
		default:
			return null;
	}
}

function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - new Date(date).getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) {
		return "just now";
	}
	if (diffMins < 60) {
		return `${diffMins}m ago`;
	}
	if (diffHours < 24) {
		return `${diffHours}h ago`;
	}
	return `${diffDays}d ago`;
}

interface RecentActivityProps {
	events: AdminDashboardMetrics["recentActivity"] | undefined;
}

const PAGE_SIZE = 20;

export function RecentActivity({ events }: RecentActivityProps) {
	const [allEvents, setAllEvents] = useState<ActivityEvent[]>(events ?? []);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState((events?.length ?? 0) === PAGE_SIZE);

	async function handleShowMore() {
		const lastEvent = allEvents[allEvents.length - 1];
		if (!lastEvent) return;
		setLoading(true);
		try {
			const more = await getMoreActivity({
				data: { cursor: lastEvent.id },
			});
			setAllEvents((prev) => [...prev, ...more]);
			setHasMore(more.length === PAGE_SIZE);
		} finally {
			setLoading(false);
		}
	}

	if (!allEvents || allEvents.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Recent Activity</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-[300px] items-center justify-center">
						<p className="text-muted-foreground">No recent activity</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recent Activity</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="max-h-[400px] space-y-3 overflow-y-auto">
					{allEvents.map((event) => {
						const Icon = getEventIcon(event.type);
						const colorClass = getEventColor(event.type);
						const label = activityLabels[event.type] ?? event.type;
						const description = getEventDescription(event);
						const isUserEvent = event.type.startsWith("USER_");

						return (
							<div
								key={event.id}
								className="flex items-start gap-3 border-b pb-3 last:border-b-0"
							>
								<div className={cn("mt-0.5", colorClass)}>
									<Icon className="size-4" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<Badge variant="outline" className="shrink-0 text-xs">
											{label}
										</Badge>
										<span className="text-xs text-muted-foreground">
											{formatTimeAgo(event.createdAt)}
										</span>
									</div>

									{event.submissionId && event.submissionTitle && (
										<Link
											to="/admin/submissions/$id"
											params={{ id: event.submissionId }}
											className="mt-1 block truncate text-sm hover:underline"
										>
											{event.submissionTitle}
										</Link>
									)}

									{isUserEvent && event.userId && event.userName && (
										<Link
											to="/admin/users/$id"
											params={{ id: event.userId }}
											className="mt-1 block truncate text-sm hover:underline"
										>
											{event.userName}
										</Link>
									)}

									{!isUserEvent && !event.submissionId && event.userName && (
										<span className="mt-1 block truncate text-sm">
											{event.userName}
										</span>
									)}

									{description && (
										<p className="mt-0.5 text-xs text-muted-foreground">
											{description}
										</p>
									)}

									<span className="text-xs text-muted-foreground">
										{event.performerName
											? `by ${event.performerName}`
											: "System"}
									</span>
								</div>
							</div>
						);
					})}
				</div>

				{hasMore && (
					<Button
						variant="outline"
						size="sm"
						className="mt-3 w-full"
						onClick={handleShowMore}
						disabled={loading}
					>
						{loading && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Show more
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
