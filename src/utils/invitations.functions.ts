import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "./auth.middleware";
import {
	consumeInvitation,
	validateInvitationToken,
} from "./invitations.server";

export const validateInvitationTokenFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ token: z.string() }))
	.handler(async ({ data }) => {
		return validateInvitationToken(data.token);
	});

export const consumeInvitationFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(z.object({ token: z.string() }))
	.handler(async ({ data, context }) => {
		return consumeInvitation(data.token, context.user.id);
	});
