import { describe, expect, it } from "vitest";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { buildHealthAlerts } from "./health-alerts-data";

const health = (
	over: Partial<AdminDashboardMetrics["health"]> = {},
): AdminDashboardMetrics["health"] => ({
	overdueReviews: 0,
	pendingDecisions: 0,
	unverifiedUsers: 0,
	...over,
});

const okS3 = {
	status: "healthy",
	endpoint: "e",
	bucket: "b",
	message: "ok",
} as AdminDashboardMetrics["s3"];
const okSmtp = {
	status: "healthy",
	host: "h",
	port: 25,
	message: "ok",
} as AdminDashboardMetrics["smtp"];

const keys = (a: ReturnType<typeof buildHealthAlerts>) => a.map((x) => x.key);

describe("buildHealthAlerts", () => {
	it("is empty when everything is healthy and under thresholds", () => {
		expect(buildHealthAlerts(health(), okS3, okSmtp)).toEqual([]);
	});

	it("surfaces SMTP and storage outages first", () => {
		const alerts = buildHealthAlerts(
			health(),
			{ status: "error", endpoint: "e", bucket: "b", message: "down" },
			{ status: "error", host: "h", port: 25, message: "down" },
		);
		expect(keys(alerts)).toEqual(["smtp", "s3"]);
		expect(alerts[0].severity).toBe("destructive");
		expect(alerts[1].message).toContain("e/b");
	});

	it("applies the count thresholds with severities and links", () => {
		const alerts = buildHealthAlerts(
			health({ overdueReviews: 2, pendingDecisions: 6, unverifiedUsers: 11 }),
			okS3,
			okSmtp,
		);
		expect(keys(alerts)).toEqual(["overdue", "pending", "unverified"]);
		expect(alerts[0]).toMatchObject({
			severity: "destructive",
			message: "2 reviews overdue",
			link: { to: "/admin/submissions" },
		});
		expect(alerts[1].severity).toBe("warning");
		expect(alerts[2]).toMatchObject({
			severity: "info",
			link: { to: "/admin/users" },
		});
	});

	it("respects exact threshold boundaries (>0, >5, >10)", () => {
		expect(
			buildHealthAlerts(health({ pendingDecisions: 5 }), okS3, okSmtp),
		).toEqual([]);
		expect(
			buildHealthAlerts(health({ unverifiedUsers: 10 }), okS3, okSmtp),
		).toEqual([]);
		expect(
			keys(buildHealthAlerts(health({ overdueReviews: 1 }), okS3, okSmtp)),
		).toEqual(["overdue"]);
	});

	it("ignores count alerts when health data is missing", () => {
		expect(buildHealthAlerts(undefined, okS3, okSmtp)).toEqual([]);
	});
});
