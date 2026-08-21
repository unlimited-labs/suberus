import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/features/auth/server/middleware";
import {
	createInvitedTalk,
	getInvitedTalk,
	updateInvitedTalk,
} from "@/features/planner/server/invited";
import {
	createPresentation,
	deletePresentation,
	reorderPresentations,
	setPresentationCancelled,
	updatePresentationDuration,
} from "@/features/planner/server/presentations";
import {
	idInput,
	invitedTalkCreateInput,
	invitedTalkUpdateInput,
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

export const createInvitedTalkFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(invitedTalkCreateInput)
	.handler(async ({ data, context }) => {
		return createInvitedTalk(data, context.user.id);
	});

export const updateInvitedTalkFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(invitedTalkUpdateInput)
	.handler(async ({ data }) => {
		const { id, ...fields } = data;
		await updateInvitedTalk(id, fields);
	});

export const getInvitedTalkFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(idInput)
	.handler(async ({ data }) => {
		return getInvitedTalk(data.id);
	});

export const invitedTalkQueryOptions = (slotId: string) =>
	queryOptions({
		queryKey: ["invitedTalk", slotId],
		queryFn: () => getInvitedTalkFn({ data: { id: slotId } }),
	});
