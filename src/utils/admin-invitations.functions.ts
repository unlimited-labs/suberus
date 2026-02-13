import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	cancelInvitation,
	createInvitation,
	getInvitations,
	resendInvitation,
} from "./admin-invitations.server";
import { adminOnlyMiddleware } from "./auth.middleware";

export const getAdminInvitationsFn = createServerFn({ method: "GET" })
	.middleware([adminOnlyMiddleware])
	.handler(async () => {
		return getInvitations();
	});

const createInvitationSchema = z.object({
	email: z.string().email(),
	role: z.enum(["EDITOR", "REVIEWER"]),
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
	.handler(async ({ data }) => {
		return cancelInvitation(data.id);
	});

export const resendInvitationFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.inputValidator(idSchema)
	.handler(async ({ data }) => {
		return resendInvitation(data.id);
	});
