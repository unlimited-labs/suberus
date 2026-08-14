import { IconLoader2 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { createElement, useState } from "react";
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
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { formatRelativeTime } from "@/shared/lib/format-date";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";

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

function PerformerByline({ event }: { event: ActivityEvent }) {
	if (!event.performerName) return "System";
	if (!event.performerId) return `by ${event.performerName}`;
	return (
		<>
			by{" "}
			<Link
				to="/admin/users/$id"
				params={{ id: event.performerId }}
				className="hover:underline"
			>
				{event.performerName}
			</Link>
		</>
	);
}

function ActivityEventRow({ event }: { event: ActivityEvent }) {
	const colorClass = getEventColor(event.type);
	const label = activityLabels[event.type] ?? event.type;
	const description = getEventDescription(event);
	const subject = resolveActivitySubject(event);
	const { formatDateTime } = useDateFormat();

	return (
		<div className="flex items-start gap-3 border-b pb-3 last:border-b-0">
			<div className={cn("mt-0.5", colorClass)}>
				{createElement(getEventIcon(event.type), { className: "size-4" })}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="shrink-0 text-xs">
						{label}
					</Badge>
					<span
						className="text-xs text-muted-foreground"
						title={formatDateTime(event.createdAt)}
					>
						{formatRelativeTime(event.createdAt)}
					</span>
				</div>

				<ActivityEventSubject subject={subject} />

				{description && (
					<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
				)}

				<span className="text-xs text-muted-foreground">
					<PerformerByline event={event} />
				</span>
			</div>
		</div>
	);
}

export function RecentActivity({ events }: RecentActivityProps) {
	const [extraEvents, setExtraEvents] = useState<ActivityEvent[]>([]);
	const [loading, setLoading] = useState(false);
	// The seeded first page arrives with the dashboard metrics, so only a full
	// page tells us there may be more; every later page carries its own cursor.
	const [cursor, setCursor] = useState<string | null>(
		events?.length === PAGE_SIZE ? (events.at(-1)?.id ?? null) : null,
	);
	const allEvents = [...(events ?? []), ...extraEvents];

	async function handleShowMore() {
		if (!cursor) return;
		setLoading(true);
		try {
			const page = await getMoreActivity({ data: { cursor } });
			setExtraEvents((prev) => [...prev, ...page.entries]);
			setCursor(page.nextCursor);
		} catch (error) {
			setLoading(false);
			throw error;
		}
		setLoading(false);
	}

	if (!allEvents || allEvents.length === 0) {
		return (
			<SectionCard title="Recent Activity">
				<div className="flex h-[300px] items-center justify-center">
					<p className="text-muted-foreground">No recent activity</p>
				</div>
			</SectionCard>
		);
	}

	return (
		<SectionCard title="Recent Activity">
			<div className="max-h-[400px] space-y-3 overflow-y-auto">
				{allEvents.map((event) => (
					<ActivityEventRow key={event.id} event={event} />
				))}
			</div>

			{cursor && (
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
		</SectionCard>
	);
}
