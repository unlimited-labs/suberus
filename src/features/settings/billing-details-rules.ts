import type { z } from "zod";
import {
	type BillingDetailsSettings,
	STRUCTURED_BILLING_FIELDS,
	type StructuredBillingColumn,
} from "./billing-details-schema";

export interface BillingColumnValues {
	billingText?: string | null;
	billingOrganization?: string | null;
	billingStreet?: string | null;
	billingPostalCode?: string | null;
	billingCity?: string | null;
}

interface BillingValues extends BillingColumnValues {
	needInvoice: boolean;
}

interface BillingIssue {
	path: "billingText" | StructuredBillingColumn;
	message: string;
}

export function invoiceNeeded(
	needInvoice: boolean,
	config: BillingDetailsSettings,
): boolean {
	return config.invoiceRequired || needInvoice;
}

export function billingTextError(
	billingText: string | null | undefined,
	needed: boolean,
): string | undefined {
	return needed && !billingText?.trim()
		? "Billing details are required"
		: undefined;
}

export function billingFieldError(
	value: string | null | undefined,
	required: boolean,
): string | undefined {
	return required && !value?.trim() ? "This field is required" : undefined;
}

export function billingDetailsIssues(
	values: BillingValues,
	config: BillingDetailsSettings,
): BillingIssue[] {
	const needed = invoiceNeeded(values.needInvoice, config);
	if (config.mode === "FREE_TEXT") {
		const message = billingTextError(values.billingText, needed);
		return message ? [{ path: "billingText", message }] : [];
	}
	return STRUCTURED_BILLING_FIELDS.flatMap(({ key, column }) => {
		const message = billingFieldError(
			values[column],
			needed && config.fields[key].state === "REQUIRED",
		);
		return message ? [{ path: column, message }] : [];
	});
}

export function submittedBillingValues(
	values: BillingValues,
	config: BillingDetailsSettings,
): BillingColumnValues {
	if (!invoiceNeeded(values.needInvoice, config)) return {};
	if (config.mode === "FREE_TEXT") {
		return { billingText: values.billingText || undefined };
	}
	const shown: BillingColumnValues = {};
	for (const { key, column } of STRUCTURED_BILLING_FIELDS) {
		if (config.fields[key].state !== "OFF") {
			shown[column] = values[column] || undefined;
		}
	}
	return shown;
}

export function buyerLines(
	values: BillingColumnValues & { country?: string | null },
): string[] {
	return [
		...(values.billingText ?? "").split("\n"),
		values.billingOrganization,
		values.billingStreet,
		[values.billingPostalCode, values.billingCity].filter(Boolean).join(" "),
		values.country,
	]
		.map((line) => line?.trim() ?? "")
		.filter(Boolean);
}

export function billingColumnsToForm(values: BillingColumnValues) {
	return {
		billingText: values.billingText ?? "",
		billingOrganization: values.billingOrganization ?? "",
		billingStreet: values.billingStreet ?? "",
		billingPostalCode: values.billingPostalCode ?? "",
		billingCity: values.billingCity ?? "",
	};
}

export function billingColumnsToDb(values: BillingColumnValues) {
	return {
		billingText: values.billingText || null,
		billingOrganization: values.billingOrganization || null,
		billingStreet: values.billingStreet || null,
		billingPostalCode: values.billingPostalCode || null,
		billingCity: values.billingCity || null,
	};
}

export function applyBillingConfig<T extends z.ZodType<BillingValues>>(
	schema: T,
	config: BillingDetailsSettings,
): T {
	return schema.superRefine((values, ctx) => {
		for (const { path, message } of billingDetailsIssues(values, config)) {
			ctx.addIssue({ code: "custom", path: [path], message });
		}
	});
}
