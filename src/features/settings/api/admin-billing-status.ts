import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/features/auth/server/middleware";
import {
	type BillingDetailsSettings,
	billingDetailsSettingsSchema,
} from "@/features/settings/billing-details-schema";
import { countIncompleteUsers } from "@/features/settings/server/admin-billing-status";

export const countIncompleteUsersFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(billingDetailsSettingsSchema)
	.handler(({ data }) => countIncompleteUsers(data));

export const incompleteCountQueryOptions = (
	requiredness: BillingDetailsSettings,
) =>
	queryOptions({
		queryKey: ["settings", "billing-details", "incomplete-count", requiredness],
		queryFn: () => countIncompleteUsersFn({ data: requiredness }),
		staleTime: 30_000,
	});
