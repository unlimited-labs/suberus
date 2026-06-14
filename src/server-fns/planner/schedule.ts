import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { PublicProgram } from "@/lib/server/planner/schedule";
import {
	getCapacity,
	getPublicProgram,
	getScheduleIssues,
	getScheduleState,
	publishSchedule,
	publishScheduleDraft,
	unpublishSchedule,
} from "@/lib/server/planner/schedule";
import { getSettings } from "@/lib/server/settings";
import {
	adminMiddleware,
	authMiddleware,
} from "@/shared/server/middleware/auth";
import { auth } from "../../../auth.server";

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

export const scheduleCapacityQueryOptions = () =>
	queryOptions({
		queryKey: ["schedule", "capacity"],
		queryFn: () => getScheduleCapacityFn(),
	});

export const getScheduleCapacityFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getCapacity();
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

export const publishScheduleDraftFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.handler(async ({ context }) => {
		await publishScheduleDraft(context.user.id);
	});

export const unpublishScheduleFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.handler(async () => {
		await unpublishSchedule();
	});

export const publicProgramQueryOptions = () =>
	queryOptions({
		queryKey: ["program", "public"],
		queryFn: () => getPublicProgramFn(),
	});

export const getPublicProgramFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<PublicProgram | null> => {
		const session = await auth.api.getSession({ headers: getRequestHeaders() });
		const role = session?.user?.role;
		const canPreviewDraft = role === "ADMIN" || role === "EDITOR";
		return getPublicProgram(canPreviewDraft);
	},
);

export interface PublicConferenceInfo {
	name: string;
	subtitle: string;
	startDate: string;
	endDate: string;
	timezone: string;
}

export const publicConferenceInfoQueryOptions = () =>
	queryOptions({
		queryKey: ["conference", "public-info"],
		queryFn: () => getPublicConferenceInfoFn(),
	});

export const getPublicConferenceInfoFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<PublicConferenceInfo> => {
	const s = await getSettings([
		"CONFERENCE_NAME",
		"CONFERENCE_SUBTITLE",
		"CONFERENCE_DATE_START",
		"CONFERENCE_DATE_END",
		"CONFERENCE_TIMEZONE",
	]);
	return {
		name: s.CONFERENCE_NAME,
		subtitle: s.CONFERENCE_SUBTITLE ?? "",
		startDate: s.CONFERENCE_DATE_START,
		endDate: s.CONFERENCE_DATE_END,
		timezone: s.CONFERENCE_TIMEZONE,
	};
});
