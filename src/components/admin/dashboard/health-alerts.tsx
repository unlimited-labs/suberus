import {
	IconAlertCircle,
	IconAlertTriangle,
	IconInfoCircle,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AdminDashboardMetrics } from "@/utils/admin-dashboard.server";

interface HealthAlertsProps {
	data: AdminDashboardMetrics["health"] | undefined;
}

export function HealthAlerts({ data }: HealthAlertsProps) {
	if (!data) {
		return null;
	}

	const { overdueReviews, pendingDecisions, unverifiedUsers } = data;

	// Critical: Overdue reviews
	if (overdueReviews > 0) {
		return (
			<Alert variant="destructive">
				<IconAlertCircle className="h-4 w-4" />
				<AlertTitle>Critical: Overdue Reviews</AlertTitle>
				<AlertDescription className="flex items-center justify-between">
					<span>
						{overdueReviews} review{overdueReviews === 1 ? "" : "s"} overdue
					</span>
					<Button variant="outline" size="sm" asChild>
						<Link to="/admin/submissions">View Submissions</Link>
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	// Warning: Pending decisions
	if (pendingDecisions > 5) {
		return (
			<Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
				<IconAlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
				<AlertTitle className="text-yellow-800 dark:text-yellow-200">
					Warning: Pending Decisions
				</AlertTitle>
				<AlertDescription className="flex items-center justify-between text-yellow-700 dark:text-yellow-300">
					<span>
						{pendingDecisions} submission{pendingDecisions === 1 ? "" : "s"}{" "}
						awaiting decision
					</span>
					<Button variant="outline" size="sm" asChild>
						<Link to="/admin/submissions">View Submissions</Link>
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	// Info: Unverified users
	if (unverifiedUsers > 10) {
		return (
			<Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
				<IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
				<AlertTitle className="text-blue-800 dark:text-blue-200">
					Info: Unverified Users
				</AlertTitle>
				<AlertDescription className="flex items-center justify-between text-blue-700 dark:text-blue-300">
					<span>
						{unverifiedUsers} user{unverifiedUsers === 1 ? "" : "s"} with
						unverified emails
					</span>
					<Button variant="outline" size="sm" asChild>
						<Link to="/admin/users">View Users</Link>
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	return null;
}
