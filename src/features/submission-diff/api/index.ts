import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/features/auth/server/middleware";
import { getVersionRedline } from "@/features/submission-diff/server/redline";
import type { UserRole } from "@/generated/prisma/enums";

/** File-redline HTML for a version pair (defaults to the previous version). */
export const getVersionRedlineFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			newVersionId: z.uuid(),
			oldVersionId: z.uuid().optional(),
		}),
	)
	.handler(({ data, context }) =>
		getVersionRedline(
			data,
			context.user.id,
			(context.user.role ?? "AUTHOR") as UserRole,
		),
	);

export const versionRedlineQueryOptions = (
	newVersionId: string,
	oldVersionId?: string,
) =>
	queryOptions({
		queryKey: [
			"submission-diff",
			"redline",
			newVersionId,
			oldVersionId ?? null,
		],
		queryFn: () =>
			getVersionRedlineFn({ data: { newVersionId, oldVersionId } }),
	});
