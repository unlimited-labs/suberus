import type { z } from "zod";
import type { BillingDetailsSettings } from "./billing-details-schema";

interface BillingValues {
	needInvoice: boolean;
	billingText: string;
}

export function invoiceNeeded(
	needInvoice: boolean,
	config: BillingDetailsSettings,
): boolean {
	return config.invoiceRequired || needInvoice;
}

export function billingTextError(
	billingText: string | undefined,
	needed: boolean,
): string | undefined {
	return needed && !billingText?.trim()
		? "Billing details are required"
		: undefined;
}

export function applyBillingConfig<T extends z.ZodType<BillingValues>>(
	schema: T,
	config: BillingDetailsSettings,
): T {
	return schema.superRefine((values, ctx) => {
		const message = billingTextError(
			values.billingText,
			invoiceNeeded(values.needInvoice, config),
		);
		if (message) {
			ctx.addIssue({ code: "custom", path: ["billingText"], message });
		}
	});
}
