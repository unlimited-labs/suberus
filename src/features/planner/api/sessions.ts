import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import {
	assignChair,
	continueSeries,
	createSession,
	createSessionWithPresentations,
	deleteSession,
	listSessions,
	listUnscheduledSubmissions,
	moveSession,
	removeChair,
	splitSession,
	updateSession,
} from "@/features/planner/server/sessions";
import { zDateString } from "@/shared/lib/validations/zod-helpers";

export const allSessionsQueryOptions = () =>
	queryOptions({
		queryKey: ["programSessions", "all"],
		queryFn: () => listSessionsFn(),
	});

export const listSessionsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return listSessions();
	});

const sessionCreateSchema = z.object({
	title: z.string().max(300).optional(),
	trackId: z.uuid().nullable().optional(),
	roomId: z.uuid().nullable().optional(),
	startAt: zDateString,
	endAt: zDateString,
});

export const createSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sessionCreateSchema)
	.handler(async ({ data }) => {
		return createSession(data);
	});

export const updateSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			id: z.uuid(),
			title: z.string().min(1).max(300).optional(),
			trackId: z.uuid().nullable().optional(),
			roomId: z.uuid().nullable().optional(),
			startAt: zDateString.optional(),
			endAt: zDateString.optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await updateSession(id, rest);
	});

export const deleteSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteSession(data.id);
	});

export const moveSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			id: z.uuid(),
			startAt: zDateString,
			endAt: zDateString,
			roomId: z.uuid().nullable().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await moveSession(id, rest);
	});

export const assignChairFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ sessionId: z.uuid(), userId: z.uuid() }))
	.handler(async ({ data }) => {
		await assignChair(data.sessionId, data.userId);
	});

export const removeChairFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ sessionId: z.uuid(), userId: z.uuid() }))
	.handler(async ({ data }) => {
		await removeChair(data.sessionId, data.userId);
	});

export const unscheduledSubmissionsQueryOptions = () =>
	queryOptions({
		queryKey: ["unscheduledSubmissions"],
		queryFn: () => listUnscheduledSubmissionsFn(),
	});

export const listUnscheduledSubmissionsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return listUnscheduledSubmissions();
	});

export const createSessionWithPresentationsFn = createServerFn({
	method: "POST",
})
	.middleware([adminMiddleware])
	.validator(
		z.object({
			title: z.string().max(300).optional(),
			trackId: z.uuid().nullable().optional(),
			roomId: z.uuid().nullable().optional(),
			startAt: zDateString,
			endAt: zDateString,
			slotDurationMin: z.number().int().min(1).max(480),
			submissionIds: z.array(z.uuid()).min(1),
		}),
	)
	.handler(async ({ data }) => {
		return createSessionWithPresentations(data);
	});

export const continueSeriesFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ sessionId: z.uuid() }))
	.handler(async ({ data }) => {
		return continueSeries(data.sessionId);
	});

export const splitSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			sessionId: z.uuid(),
			afterSlotOrder: z.number().int().min(0),
		}),
	)
	.handler(async ({ data }) => {
		return splitSession(data.sessionId, data.afterSlotOrder);
	});
