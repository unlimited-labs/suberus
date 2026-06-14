import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	createBreak,
	deleteBreak,
	listBreaks,
	updateBreak,
} from "@/features/planner/server/breaks";
import { zDateString } from "@/lib/validations/zod-helpers";
import {
	adminMiddleware,
	authMiddleware,
} from "@/shared/server/middleware/auth";

export const allBreaksQueryOptions = () =>
	queryOptions({
		queryKey: ["scheduleBreaks", "all"],
		queryFn: () => listBreaksFn(),
	});

export const listBreaksFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return listBreaks();
	});

export const createBreakFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			title: z.string().min(1).max(200),
			roomId: z.uuid().nullable().optional(),
			startAt: zDateString,
			endAt: zDateString,
		}),
	)
	.handler(async ({ data }) => {
		return createBreak(data);
	});

export const updateBreakFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			title: z.string().min(1).max(200).optional(),
			roomId: z.uuid().nullable().optional(),
			startAt: zDateString.optional(),
			endAt: zDateString.optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await updateBreak(id, rest);
	});

export const deleteBreakFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteBreak(data.id);
	});
