import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { listActivity } from "@/features/activity-log/server/query";
import { activityLogListInput } from "@/features/activity-log/validations";
import { adminMiddleware } from "@/features/auth/server/middleware";
import { getAdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";

export const getAdminDashboard = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async ({ context }) => {
		const metrics = await getAdminDashboardMetrics();
		// System health (infra status + alerts) is admin-only; strip for editors.
		if (context.user.role !== "ADMIN") {
			return {
				...metrics,
				s3: undefined,
				smtp: undefined,
				llm: undefined,
				pdfApi: undefined,
				docxApi: undefined,
			};
		}
		return metrics;
	});

export const getMoreActivity = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(activityLogListInput)
	.handler(async ({ data }) => {
		const { entries } = await listActivity(data);
		return entries;
	});

export const adminDashboardQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "dashboard"],
		queryFn: () => getAdminDashboard(),
	});
