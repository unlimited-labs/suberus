import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth.middleware";
import { getUserDashboardMetrics } from "./user-dashboard.server";

export const getUserDashboard = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		return getUserDashboardMetrics(context.user.id);
	});
