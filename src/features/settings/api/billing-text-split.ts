import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/features/auth/server/middleware";
import {
	isBillingTextSplitAvailable,
	splitBillingText,
} from "@/features/settings/server/billing-text-split";
import { allowRequest } from "@/shared/server/rate-limit";

export const billingTextSplitAvailableFn = createServerFn({
	method: "GET",
}).handler(() => isBillingTextSplitAvailable());

export const billingTextSplitAvailableQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "billing-details", "text-split-available"],
		queryFn: () => billingTextSplitAvailableFn(),
		staleTime: Number.POSITIVE_INFINITY,
	});

export const splitBillingTextFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			text: z.string().max(500),
			country: z.string().max(100).optional(),
		}),
	)
	.handler(({ data, context }) => {
		if (!allowRequest(`billing-text-split:${context.user.id}`, 10, 60_000)) {
			throw new Response("Too many requests. Try again in a minute.", {
				status: 429,
			});
		}
		return splitBillingText(data.text, data.country);
	});
