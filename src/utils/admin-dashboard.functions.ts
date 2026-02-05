import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "./auth.middleware";
import { getAdminDashboardMetrics } from "./admin-dashboard.server";

export const getAdminDashboard = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getAdminDashboardMetrics();
	});
