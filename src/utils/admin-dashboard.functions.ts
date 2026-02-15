import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getAdminDashboardMetrics } from "./admin-dashboard.server";
import { adminMiddleware } from "./auth.middleware";

export const getAdminDashboard = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getAdminDashboardMetrics();
	});

export const adminDashboardQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "dashboard"],
		queryFn: () => getAdminDashboard(),
	});
