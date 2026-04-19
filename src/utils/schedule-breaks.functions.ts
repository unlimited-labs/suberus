import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware, authMiddleware } from "./auth.middleware";
import {
	createBreak,
	deleteBreak,
	listBreaks,
	updateBreak,
} from "./schedule-breaks.server";

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
			startAt: z.iso.datetime(),
			endAt: z.iso.datetime(),
		}),
	)
	.handler(async ({ data }) => {
		return createBreak({
			...data,
			startAt: new Date(data.startAt),
			endAt: new Date(data.endAt),
		});
	});

export const updateBreakFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			title: z.string().min(1).max(200).optional(),
			roomId: z.uuid().nullable().optional(),
			startAt: z.iso.datetime().optional(),
			endAt: z.iso.datetime().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, startAt, endAt, ...rest } = data;
		await updateBreak(id, {
			...rest,
			...(startAt ? { startAt: new Date(startAt) } : {}),
			...(endAt ? { endAt: new Date(endAt) } : {}),
		});
	});

export const deleteBreakFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteBreak(data.id);
	});
