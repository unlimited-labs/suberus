import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	consumeInvitation,
	validateInvitationToken,
} from "@/lib/server/admin/invitations";
import { authMiddleware } from "@/shared/server/middleware/auth";

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
