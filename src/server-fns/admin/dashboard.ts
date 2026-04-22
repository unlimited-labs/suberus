import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminDashboardMetrics } from "@/lib/server/admin/dashboard";
import { adminMiddleware } from "@/lib/server/middleware/auth";

export const getAdminDashboard = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getAdminDashboardMetrics();
	});

export const getMoreActivity = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ cursor: z.string().optional() }))
	.handler(async ({ data }) => {
		const { prisma } = await import("@/db.server");
		const items = await prisma.activityLog.findMany({
			take: 20,
			...(data.cursor
				? {
						skip: 1,
						cursor: { id: data.cursor },
					}
				: {}),
			orderBy: { createdAt: "desc" },
			include: {
				submission: { select: { id: true, title: true } },
				user: { select: { id: true, firstName: true, lastName: true } },
				performer: {
					select: { id: true, firstName: true, lastName: true },
				},
			},
		});

		return items.map((item) => ({
			id: item.id,
			type: item.type,
			userId: item.userId,
			submissionId: item.submissionId,
			performerName: item.performer
				? `${item.performer.firstName ?? ""} ${item.performer.lastName ?? ""}`.trim() ||
					null
				: null,
			submissionTitle: item.submission?.title ?? null,
			userName: item.user
				? `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() ||
					null
				: null,
			detail: item.detail as Record<
				string,
				string | number | boolean | null
			> | null,
			createdAt: item.createdAt,
		}));
	});

export const adminDashboardQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "dashboard"],
		queryFn: () => getAdminDashboard(),
	});
