import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/features/auth/server/middleware";
import {
	consumeInvitation,
	validateInvitationToken,
} from "@/features/invitations/server/invitations";

export const validateInvitationTokenFn = createServerFn({ method: "GET" })
	.validator(z.object({ token: z.string() }))
	.handler(async ({ data }) => {
		return validateInvitationToken(data.token);
	});

export const consumeInvitationFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ token: z.string() }))
	.handler(async ({ data, context }) => {
		return consumeInvitation(data.token, context.user.id);
	});
