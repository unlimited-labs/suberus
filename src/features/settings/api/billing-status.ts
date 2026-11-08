import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/features/auth/server/middleware";
import { getInvoiceStateForUser } from "@/features/settings/server/billing-status";

export const getMyInvoiceStateFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => getInvoiceStateForUser(context.user.id));

export const myInvoiceStateQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "billing-details", "my-invoice-state"],
		queryFn: () => getMyInvoiceStateFn(),
	});
