import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware, authMiddleware } from "./auth.middleware";
import {
	getScheduleIssues,
	getScheduleState,
	publishSchedule,
	unpublishSchedule,
} from "./schedule.server";

export const scheduleStateQueryOptions = () =>
	queryOptions({
		queryKey: ["schedule", "state"],
		queryFn: () => getScheduleStateFn(),
	});

export const scheduleIssuesQueryOptions = () =>
	queryOptions({
		queryKey: ["schedule", "issues"],
		queryFn: () => getScheduleIssuesFn(),
	});

export const getScheduleStateFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getScheduleState();
	});

export const getScheduleIssuesFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getScheduleIssues();
	});

export const publishScheduleFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.handler(async ({ context }) => {
		await publishSchedule(context.user.id);
	});

export const unpublishScheduleFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.handler(async () => {
		await unpublishSchedule();
	});
