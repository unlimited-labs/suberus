import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import {
	becomeExhibitor,
	decideExhibitor,
	getExhibitorDetail,
	getOwnExhibitor,
	isExhibitorSignupAvailable,
	listExhibitors,
	saveExhibitorApplication,
	setExhibitorPackage,
	withdrawOwnExhibitor,
} from "@/features/exhibitors/server/exhibitors";
import { exhibitorApplicationSchema } from "@/features/exhibitors/validations";
import { getSubmissionTypeConfigs } from "@/features/settings/server/settings";

export const exhibitorSignupAvailableFn = createServerFn({
	method: "GET",
}).handler(() => isExhibitorSignupAvailable());

export const becomeExhibitorFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(({ context }) => becomeExhibitor(context.user.id));

export const getMyExhibitorFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => getOwnExhibitor(context.user.id));

export const saveExhibitorApplicationFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(exhibitorApplicationSchema)
	.handler(({ context, data }) =>
		saveExhibitorApplication(context.user.id, data),
	);

export const withdrawMyExhibitorFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(({ context }) => withdrawOwnExhibitor(context.user.id));

export const exhibitorPanelConfigFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		const configs = await getSubmissionTypeConfigs();
		return {
			allowPresentation: configs.EXHIBITOR.allowExhibitorPresentation,
		};
	});

// Prisma Decimal does not cross the server-fn serialization boundary
function mapUserFee<F extends { amount: unknown }, U extends { fee: F | null }>(
	user: U,
) {
	return {
		...user,
		fee: user.fee
			? {
					...user.fee,
					amount: user.fee.amount ? Number(user.fee.amount) : null,
				}
			: null,
	};
}

export const listExhibitorsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		const rows = await listExhibitors();
		return rows.map((r) => ({ ...r, user: mapUserFee(r.user) }));
	});

export const getExhibitorFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const row = await getExhibitorDetail(data.id);
		if (!row) return null;
		return { ...row, user: mapUserFee(row.user) };
	});

export const setExhibitorPackageFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			id: z.uuid(),
			package: z.string().max(200).nullable(),
		}),
	)
	.handler(({ data }) => setExhibitorPackage(data.id, data.package));

export const decideExhibitorFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			id: z.uuid(),
			decision: z.enum(["APPROVED", "REJECTED"]),
			reason: z.string().min(3),
		}),
	)
	.handler(({ context, data }) =>
		decideExhibitor(data.id, data.decision, data.reason, context.user.id),
	);

export const exhibitorSignupAvailableQueryOptions = () =>
	queryOptions({
		queryKey: ["exhibitor", "signup-available"],
		queryFn: () => exhibitorSignupAvailableFn(),
	});

export const myExhibitorQueryOptions = () =>
	queryOptions({
		queryKey: ["exhibitor", "me"],
		queryFn: () => getMyExhibitorFn(),
	});

export const exhibitorPanelConfigQueryOptions = () =>
	queryOptions({
		queryKey: ["exhibitor", "panel-config"],
		queryFn: () => exhibitorPanelConfigFn(),
	});

export const listExhibitorsQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "exhibitors"],
		queryFn: () => listExhibitorsFn(),
	});

export const exhibitorDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["admin", "exhibitors", id],
		queryFn: () => getExhibitorFn({ data: { id } }),
	});
