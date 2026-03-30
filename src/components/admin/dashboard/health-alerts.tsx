import {
	IconAlertCircle,
	IconAlertTriangle,
	IconInfoCircle,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatLlmStatus, pluralize } from "@/lib/format-llm-status";
import type { AdminDashboardMetrics } from "@/utils/admin-dashboard.server";

interface HealthAlertsProps {
	data: AdminDashboardMetrics["health"] | undefined;
	s3: AdminDashboardMetrics["s3"] | undefined;
	smtp: AdminDashboardMetrics["smtp"] | undefined;
	llm: AdminDashboardMetrics["llm"] | undefined;
	docling: AdminDashboardMetrics["docling"] | undefined;
}

export function HealthAlerts({
	data,
	s3,
	smtp,
	llm,
	docling,
}: HealthAlertsProps) {
	return (
		<>
			{smtp?.status === "error" ? (
				<Alert variant="destructive">
					<IconAlertCircle className="h-4 w-4" />
					<AlertTitle>SMTP Unavailable</AlertTitle>
					<AlertDescription>
						{smtp.message} — {smtp.host}:{smtp.port}
					</AlertDescription>
				</Alert>
			) : null}

			{s3?.status === "error" ? (
				<Alert variant="destructive">
					<IconAlertCircle className="h-4 w-4" />
					<AlertTitle>Storage Unavailable</AlertTitle>
					<AlertDescription>
						{s3.message} — {s3.endpoint}/{s3.bucket}
					</AlertDescription>
				</Alert>
			) : null}

			{data && data.overdueReviews > 0 ? (
				<Alert variant="destructive">
					<IconAlertCircle className="h-4 w-4" />
					<AlertTitle>Critical: Overdue Reviews</AlertTitle>
					<AlertDescription className="flex items-center justify-between">
						<span>
							{data.overdueReviews} {pluralize(data.overdueReviews, "review")}{" "}
							overdue
						</span>
						<Button variant="outline" size="sm" asChild>
							<Link to="/admin/submissions">View Submissions</Link>
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			{data && data.pendingDecisions > 5 ? (
				<Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
					<IconAlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
					<AlertTitle className="text-yellow-800 dark:text-yellow-200">
						Warning: Pending Decisions
					</AlertTitle>
					<AlertDescription className="flex items-center justify-between text-yellow-700 dark:text-yellow-300">
						<span>
							{data.pendingDecisions}{" "}
							{pluralize(data.pendingDecisions, "submission")} awaiting decision
						</span>
						<Button variant="outline" size="sm" asChild>
							<Link to="/admin/submissions">View Submissions</Link>
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			{data && data.unverifiedUsers > 10 ? (
				<Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
					<IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					<AlertTitle className="text-blue-800 dark:text-blue-200">
						Info: Unverified Users
					</AlertTitle>
					<AlertDescription className="flex items-center justify-between text-blue-700 dark:text-blue-300">
						<span>
							{data.unverifiedUsers} {pluralize(data.unverifiedUsers, "user")}{" "}
							with unverified emails
						</span>
						<Button variant="outline" size="sm" asChild>
							<Link to="/admin/users">View Users</Link>
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			{llm?.status === "unavailable" ? (
				<Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
					<IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					<AlertTitle className="text-blue-800 dark:text-blue-200">
						LLM Unavailable
					</AlertTitle>
					<AlertDescription className="text-blue-700 dark:text-blue-300">
						{llm.message}. AI-assisted document extraction will use
						structure-based mode.
					</AlertDescription>
				</Alert>
			) : null}

			{llm?.status === "healthy" ? (
				<Alert className="border-green-500 bg-green-50 dark:bg-green-950">
					<IconInfoCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
					<AlertTitle className="text-green-800 dark:text-green-200">
						LLM Connected
					</AlertTitle>
					<AlertDescription className="text-green-700 dark:text-green-300">
						{formatLlmStatus(llm)}
					</AlertDescription>
				</Alert>
			) : null}

			{docling?.status === "unavailable" ? (
				<Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
					<IconInfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					<AlertTitle className="text-blue-800 dark:text-blue-200">
						Docling Unavailable
					</AlertTitle>
					<AlertDescription className="text-blue-700 dark:text-blue-300">
						{docling.message}. DOCX conversion will fall back to XML parsing.
					</AlertDescription>
				</Alert>
			) : null}

			{docling?.status === "healthy" ? (
				<Alert className="border-green-500 bg-green-50 dark:bg-green-950">
					<IconInfoCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
					<AlertTitle className="text-green-800 dark:text-green-200">
						Docling Connected
					</AlertTitle>
					<AlertDescription className="text-green-700 dark:text-green-300">
						DOCX to markdown conversion service available
					</AlertDescription>
				</Alert>
			) : null}
		</>
	);
}
