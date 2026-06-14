import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getUserDashboardMetrics } from "@/features/dashboard/server/user-dashboard";
import { authMiddleware } from "@/shared/server/middleware/auth";

export const getUserDashboard = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		return getUserDashboardMetrics(context.user.id);
	});

export const userDashboardQueryOptions = () =>
	queryOptions({
		queryKey: ["dashboard"],
		queryFn: () => getUserDashboard(),
	});
