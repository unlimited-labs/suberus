import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/features/auth/server/middleware";
import {
	createPresentation,
	deletePresentation,
	reorderPresentations,
	setPresentationCancelled,
	updatePresentationDuration,
} from "@/features/planner/server/presentations";
import {
	idInput,
	presentationCancelInput,
	presentationCreateInput,
	presentationDurationInput,
	presentationReorderInput,
} from "@/features/planner/validations";

export const createPresentationFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(presentationCreateInput)
	.handler(async ({ data }) => {
		return createPresentation(data);
	});

export const deletePresentationFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(idInput)
	.handler(async ({ data }) => {
		await deletePresentation(data.id);
	});

export const updatePresentationDurationFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(presentationDurationInput)
	.handler(async ({ data }) => {
		await updatePresentationDuration(data.id, data.durationMin);
	});

export const setPresentationCancelledFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(presentationCancelInput)
	.handler(async ({ data }) => {
		await setPresentationCancelled(data.id, data.cancelled);
	});

export const reorderPresentationsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(presentationReorderInput)
	.handler(async ({ data }) => {
		await reorderPresentations(data.sessionId, data.orderedIds);
	});
