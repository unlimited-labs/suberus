import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminOnlyMiddleware } from "@/features/auth/server/middleware";
import {
	cancelInvitation,
	createInvitation,
	getInvitations,
	resendInvitation,
} from "@/features/invitations/server/invitations";

export const adminInvitationsQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "invitations"],
		queryFn: () => getAdminInvitationsFn(),
	});

export const getAdminInvitationsFn = createServerFn({ method: "GET" })
	.middleware([adminOnlyMiddleware])
	.handler(async () => {
		return getInvitations();
	});

const createInvitationSchema = z.object({
	email: z.email(),
	role: z.enum(["EDITOR", "REVIEWER", "ADMIN"]),
});

export const createInvitationFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.inputValidator(createInvitationSchema)
	.handler(async ({ data, context }) => {
		return createInvitation(data.email, data.role, context.user.id);
	});

const idSchema = z.object({ id: z.string() });

export const cancelInvitationFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.inputValidator(idSchema)
	.handler(async ({ data, context }) => {
		return cancelInvitation(data.id, context.user.id);
	});

export const resendInvitationFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.inputValidator(idSchema)
	.handler(async ({ data }) => {
		return resendInvitation(data.id);
	});
