import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { pluralize } from "@/shared/lib/utils";

export interface HealthAlertLink {
	to: "/admin/submissions" | "/admin/users";
	label: string;
}

export interface HealthAlert {
	key: string;
	severity: "destructive" | "warning" | "info";
	title: string;
	message: string;
	link?: HealthAlertLink;
}

/**
 * The dashboard health alerts that currently apply: service outages (SMTP, S3)
 * and operational thresholds (overdue reviews, pending decisions, unverified
 * users). Pure, so the alert conditions and copy are unit-testable.
 */
export function buildHealthAlerts(
	data: AdminDashboardMetrics["health"] | undefined,
	s3: AdminDashboardMetrics["s3"] | undefined,
	smtp: AdminDashboardMetrics["smtp"] | undefined,
): HealthAlert[] {
	const alerts: HealthAlert[] = [];

	if (smtp?.status === "error") {
		alerts.push({
			key: "smtp",
			severity: "destructive",
			title: "SMTP Unavailable",
			message: `${smtp.message} — ${smtp.host}:${smtp.port}`,
		});
	}
	if (s3?.status === "error") {
		alerts.push({
			key: "s3",
			severity: "destructive",
			title: "Storage Unavailable",
			message: `${s3.message} — ${s3.endpoint}/${s3.bucket}`,
		});
	}
	if (data && data.overdueReviews > 0) {
		alerts.push({
			key: "overdue",
			severity: "destructive",
			title: "Critical: Overdue Reviews",
			message: `${data.overdueReviews} ${pluralize(data.overdueReviews, "review")} overdue`,
			link: { to: "/admin/submissions", label: "View Submissions" },
		});
	}
	if (data && data.pendingDecisions > 5) {
		alerts.push({
			key: "pending",
			severity: "warning",
			title: "Warning: Pending Decisions",
			message: `${data.pendingDecisions} ${pluralize(data.pendingDecisions, "submission")} awaiting decision`,
			link: { to: "/admin/submissions", label: "View Submissions" },
		});
	}
	if (data && data.unverifiedUsers > 10) {
		alerts.push({
			key: "unverified",
			severity: "info",
			title: "Info: Unverified Users",
			message: `${data.unverifiedUsers} ${pluralize(data.unverifiedUsers, "user")} with unverified emails`,
			link: { to: "/admin/users", label: "View Users" },
		});
	}

	return alerts;
}
