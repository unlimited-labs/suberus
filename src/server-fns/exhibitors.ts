import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	becomeExhibitor,
	decideExhibitor,
	getExhibitorDetail,
	getOwnExhibitor,
	isExhibitorSignupAvailable,
	listExhibitors,
	saveExhibitorApplication,
	withdrawOwnExhibitor,
} from "@/lib/server/exhibitors";
import { adminMiddleware, authMiddleware } from "@/lib/server/middleware/auth";
import { exhibitorApplicationSchema } from "@/lib/validations/exhibitor";

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
	.inputValidator(exhibitorApplicationSchema)
	.handler(({ context, data }) =>
		saveExhibitorApplication(context.user.id, data),
	);

export const withdrawMyExhibitorFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(({ context }) => withdrawOwnExhibitor(context.user.id));

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
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const row = await getExhibitorDetail(data.id);
		if (!row) return null;
		return { ...row, user: mapUserFee(row.user) };
	});

export const decideExhibitorFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
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
