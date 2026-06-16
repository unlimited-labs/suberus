import { IconLoader2 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { activityLabels } from "@/features/activity-log/labels";
import { getMoreActivity } from "@/features/dashboard/api/admin-dashboard";
import {
	type ActivityEvent,
	type ActivitySubject,
	getEventColor,
	getEventDescription,
	getEventIcon,
	resolveActivitySubject,
} from "@/features/dashboard/components/admin/recent-activity-helpers";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { formatRelativeTime } from "@/shared/lib/format-date";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface RecentActivityProps {
	events: AdminDashboardMetrics["recentActivity"] | undefined;
}

const PAGE_SIZE = 20;

function ActivityEventSubject({ subject }: { subject: ActivitySubject }) {
	if (subject.kind === "submission") {
		return (
			<Link
				to="/admin/submissions/$id"
				params={{ id: subject.id }}
				className="mt-1 block truncate text-sm hover:underline"
			>
				{subject.title}
			</Link>
		);
	}
	if (subject.kind === "user") {
		return (
			<Link
				to="/admin/users/$id"
				params={{ id: subject.id }}
				className="mt-1 block truncate text-sm hover:underline"
			>
				{subject.name}
			</Link>
		);
	}
	if (subject.kind === "name") {
		return <span className="mt-1 block truncate text-sm">{subject.name}</span>;
	}
	return null;
}

function ActivityEventRow({ event }: { event: ActivityEvent }) {
	const Icon = getEventIcon(event.type);
	const colorClass = getEventColor(event.type);
	const label = activityLabels[event.type] ?? event.type;
	const description = getEventDescription(event);
	const subject = resolveActivitySubject(event);

	return (
		<div className="flex items-start gap-3 border-b pb-3 last:border-b-0">
			<div className={cn("mt-0.5", colorClass)}>
				<Icon className="size-4" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="shrink-0 text-xs">
						{label}
					</Badge>
					<span className="text-xs text-muted-foreground">
						{formatRelativeTime(event.createdAt)}
					</span>
				</div>

				<ActivityEventSubject subject={subject} />

				{description && (
					<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
				)}

				<span className="text-xs text-muted-foreground">
					{event.performerName ? `by ${event.performerName}` : "System"}
				</span>
			</div>
		</div>
	);
}

export function RecentActivity({ events }: RecentActivityProps) {
	const [extraEvents, setExtraEvents] = useState<ActivityEvent[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState((events?.length ?? 0) === PAGE_SIZE);
	const allEvents = [...(events ?? []), ...extraEvents];

	async function handleShowMore() {
		const lastEvent = allEvents[allEvents.length - 1];
		if (!lastEvent) return;
		setLoading(true);
		try {
			const more = await getMoreActivity({
				data: { cursor: lastEvent.id },
			});
			setExtraEvents((prev) => [...prev, ...more]);
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
					{allEvents.map((event) => (
						<ActivityEventRow key={event.id} event={event} />
					))}
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
