import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import {
	createBreak,
	deleteBreak,
	listBreaks,
	updateBreak,
} from "@/features/planner/server/breaks";
import {
	breakCreateInput,
	breakUpdateInput,
	idInput,
} from "@/features/planner/validations";

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
	.validator(breakCreateInput)
	.handler(async ({ data }) => {
		return createBreak(data);
	});

export const updateBreakFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(breakUpdateInput)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await updateBreak(id, rest);
	});

export const deleteBreakFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(idInput)
	.handler(async ({ data }) => {
		await deleteBreak(data.id);
	});
