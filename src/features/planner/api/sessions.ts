import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
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
import {
	idInput,
	sessionChairInput,
	sessionCreateInput,
	sessionIdInput,
	sessionMoveInput,
	sessionSplitInput,
	sessionUpdateInput,
	sessionWithPresentationsInput,
} from "@/features/planner/validations";

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

export const createSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sessionCreateInput)
	.handler(async ({ data }) => {
		return createSession(data);
	});

export const updateSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sessionUpdateInput)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await updateSession(id, rest);
	});

export const deleteSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(idInput)
	.handler(async ({ data }) => {
		await deleteSession(data.id);
	});

export const moveSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sessionMoveInput)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await moveSession(id, rest);
	});

export const assignChairFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sessionChairInput)
	.handler(async ({ data }) => {
		await assignChair(data.sessionId, data.userId);
	});

export const removeChairFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sessionChairInput)
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
	.validator(sessionWithPresentationsInput)
	.handler(async ({ data }) => {
		return createSessionWithPresentations(data);
	});

export const continueSeriesFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sessionIdInput)
	.handler(async ({ data }) => {
		return continueSeries(data.sessionId);
	});

export const splitSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sessionSplitInput)
	.handler(async ({ data }) => {
		return splitSession(data.sessionId, data.afterSlotOrder);
	});
