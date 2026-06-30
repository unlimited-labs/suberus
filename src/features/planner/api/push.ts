import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/features/auth/server/middleware";
import {
	deletePushSubscription,
	savePushSubscription,
} from "@/features/planner/server/push-subscriptions";

const subscriptionInput = z.object({
	endpoint: z.url(),
	p256dh: z.string().min(1),
	auth: z.string().min(1),
});

export const savePushSubscriptionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(subscriptionInput)
	.handler(({ context, data }) => savePushSubscription(context.user.id, data));

export const deletePushSubscriptionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ endpoint: z.url() }))
	.handler(({ context, data }) =>
		deletePushSubscription(context.user.id, data.endpoint),
	);
