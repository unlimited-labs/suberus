import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/features/auth/server/middleware";
import {
	isBillingTextSplitAvailable,
	splitBillingText,
} from "@/features/settings/server/billing-text-split";

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
	.handler(({ data }) => splitBillingText(data.text, data.country));
