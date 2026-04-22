import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/lib/server/middleware/auth";
import {
	createPresentation,
	deletePresentation,
	reorderPresentations,
	updatePresentationDuration,
} from "@/lib/server/planner/presentations";

export const createPresentationFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			sessionId: z.uuid(),
			submissionId: z.uuid(),
			durationMin: z.number().int().positive().max(600),
		}),
	)
	.handler(async ({ data }) => {
		return createPresentation(data);
	});

export const deletePresentationFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deletePresentation(data.id);
	});

export const updatePresentationDurationFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			durationMin: z.number().int().positive().max(600),
		}),
	)
	.handler(async ({ data }) => {
		await updatePresentationDuration(data.id, data.durationMin);
	});

export const reorderPresentationsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			sessionId: z.uuid(),
			orderedIds: z.array(z.uuid()).min(1),
		}),
	)
	.handler(async ({ data }) => {
		await reorderPresentations(data.sessionId, data.orderedIds);
	});
