import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "./auth.middleware";
import {
	createSlot,
	deleteSlot,
	reorderSlots,
	updateSlotDuration,
} from "./presentation-slots.server";

export const createSlotFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			sessionId: z.uuid(),
			submissionId: z.uuid(),
			durationMin: z.number().int().positive().max(600),
		}),
	)
	.handler(async ({ data }) => {
		return createSlot(data);
	});

export const deleteSlotFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteSlot(data.id);
	});

export const updateSlotDurationFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			durationMin: z.number().int().positive().max(600),
		}),
	)
	.handler(async ({ data }) => {
		await updateSlotDuration(data.id, data.durationMin);
	});

export const reorderSlotsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			sessionId: z.uuid(),
			orderedIds: z.array(z.uuid()).min(1),
		}),
	)
	.handler(async ({ data }) => {
		await reorderSlots(data.sessionId, data.orderedIds);
	});
