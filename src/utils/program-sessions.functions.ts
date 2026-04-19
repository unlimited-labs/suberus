import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware, authMiddleware } from "./auth.middleware";
import {
	assignChair,
	createSession,
	createSessionWithPresentations,
	deleteSession,
	listSessions,
	listUnscheduledSubmissions,
	moveSession,
	removeChair,
	updateSession,
} from "./program-sessions.server";

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
	title: z.string().min(1).max(300),
	trackId: z.uuid().nullable().optional(),
	roomId: z.uuid().nullable().optional(),
	startAt: z.iso.datetime(),
	endAt: z.iso.datetime(),
});

export const createSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(sessionCreateSchema)
	.handler(async ({ data }) => {
		return createSession({
			...data,
			startAt: new Date(data.startAt),
			endAt: new Date(data.endAt),
		});
	});

export const updateSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			title: z.string().min(1).max(300).optional(),
			trackId: z.uuid().nullable().optional(),
			roomId: z.uuid().nullable().optional(),
			startAt: z.iso.datetime().optional(),
			endAt: z.iso.datetime().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, startAt, endAt, ...rest } = data;
		await updateSession(id, {
			...rest,
			...(startAt ? { startAt: new Date(startAt) } : {}),
			...(endAt ? { endAt: new Date(endAt) } : {}),
		});
	});

export const deleteSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteSession(data.id);
	});

export const moveSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			startAt: z.iso.datetime(),
			endAt: z.iso.datetime(),
			roomId: z.uuid().nullable().optional(),
		}),
	)
	.handler(async ({ data }) => {
		await moveSession(data.id, {
			startAt: new Date(data.startAt),
			endAt: new Date(data.endAt),
			roomId: data.roomId,
		});
	});

export const assignChairFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ sessionId: z.uuid(), userId: z.uuid() }))
	.handler(async ({ data }) => {
		await assignChair(data.sessionId, data.userId);
	});

export const removeChairFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ sessionId: z.uuid(), userId: z.uuid() }))
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
	.inputValidator(
		z.object({
			title: z.string().min(1).max(300),
			trackId: z.uuid().nullable().optional(),
			roomId: z.uuid().nullable().optional(),
			startAt: z.iso.datetime(),
			endAt: z.iso.datetime(),
			slotDurationMin: z.number().int().min(1).max(480),
			submissionIds: z.array(z.uuid()).min(1),
		}),
	)
	.handler(async ({ data }) => {
		return createSessionWithPresentations({
			...data,
			startAt: new Date(data.startAt),
			endAt: new Date(data.endAt),
		});
	});
