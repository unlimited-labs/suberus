import { createServerFn } from "@tanstack/react-start";
import { getAdminDashboardMetrics } from "./admin-dashboard.server";
import { adminMiddleware } from "./auth.middleware";

export const getAdminDashboard = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getAdminDashboardMetrics();
	});
