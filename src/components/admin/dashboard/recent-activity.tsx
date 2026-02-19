import {
	IconArrowRight,
	IconCheck,
	IconFileText,
	IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminDashboardMetrics } from "@/utils/admin-dashboard.server";

interface RecentActivityProps {
	events: AdminDashboardMetrics["recentActivity"] | undefined;
}

function getEventIcon(event: string) {
	const eventLower = event.toLowerCase();
	if (eventLower.includes("accept")) {
		return IconCheck;
	}
	if (eventLower.includes("reject")) {
		return IconX;
	}
	if (eventLower.includes("submit") || eventLower.includes("review")) {
		return IconArrowRight;
	}
	return IconFileText;
}

function getEventColor(event: string): string {
	const eventLower = event.toLowerCase();
	if (eventLower.includes("accept")) {
		return "text-green-600";
	}
	if (eventLower.includes("reject")) {
		return "text-red-600";
	}
	if (eventLower.includes("submit")) {
		return "text-blue-600";
	}
	if (eventLower.includes("review")) {
		return "text-yellow-600";
	}
	return "text-gray-600";
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

export function RecentActivity({ events }: RecentActivityProps) {
	if (!events || events.length === 0) {
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
				<div className="space-y-3 max-h-[300px] overflow-y-auto">
					{events.map((event, index) => {
						const Icon = getEventIcon(event.type);
						const colorClass = getEventColor(event.type);

						return (
							<div
								key={`${event.id}-${index}`}
								className="flex items-start gap-3 pb-3 border-b last:border-b-0"
							>
								<div className={cn("mt-1", colorClass)}>
									<Icon className="size-4" />
								</div>
								<div className="flex-1 min-w-0">
									{event.submissionId ? (
										<Link
											to="/admin/submissions/$id"
											params={{ id: event.submissionId }}
											className="text-sm font-medium hover:underline truncate block"
										>
											{event.submissionTitle ?? event.type}
										</Link>
									) : (
										<span className="text-sm font-medium truncate block">
											{event.userName ?? event.type}
										</span>
									)}
									<div className="flex items-center gap-2 mt-1">
										<Badge variant="outline" className="text-xs">
											{event.type}
										</Badge>
										{event.performerName && (
											<span className="text-xs text-muted-foreground">
												by {event.performerName}
											</span>
										)}
										<span className="text-xs text-muted-foreground">
											{formatTimeAgo(event.createdAt)}
										</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
