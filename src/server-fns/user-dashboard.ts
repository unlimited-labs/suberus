import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/server/middleware/auth";
import { getUserDashboardMetrics } from "@/lib/server/user-dashboard";

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
