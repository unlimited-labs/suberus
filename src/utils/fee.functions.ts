import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth.middleware";
import { getUserFee } from "./fee.server";
import { getSetting } from "./settings.server";

export const userFeeQueryOptions = () =>
	queryOptions({
		queryKey: ["fee"],
		queryFn: () => getUserFeeFn(),
	});

export const paymentInstructionsQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "fee-instructions"],
		queryFn: () => getPaymentInstructionsFn(),
	});

/**
 * Get current user's fee
 */
export const getUserFeeFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		return getUserFee(context.user.id);
	});

/**
 * Get payment instructions
 */
export const getPaymentInstructionsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("FEE_PAYMENT_INSTRUCTIONS");
	});
