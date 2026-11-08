import type { z } from "zod";
import {
	activeBillingFields,
	type BillingCatalogueColumn,
	type BillingDetailsSettings,
} from "./billing-details-schema";

export interface BillingColumnValues {
	billingText?: string | null;
	billingOrganization?: string | null;
	billingStreet?: string | null;
	billingPostalCode?: string | null;
	billingCity?: string | null;
	vatId?: string | null;
}

interface BillingValues extends BillingColumnValues {
	needInvoice: boolean;
}

interface BillingIssue {
	path: "billingText" | BillingCatalogueColumn;
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
	const textMessage =
		config.mode === "FREE_TEXT"
			? billingTextError(values.billingText, needed)
			: undefined;
	const issues: BillingIssue[] = textMessage
		? [{ path: "billingText", message: textMessage }]
		: [];
	for (const { key, column } of activeBillingFields(config)) {
		const message = billingFieldError(
			values[column],
			needed && config.fields[key].state === "REQUIRED",
		);
		if (message) issues.push({ path: column, message });
	}
	return issues;
}

export function submittedBillingValues(
	values: BillingValues,
	config: BillingDetailsSettings,
): BillingColumnValues {
	if (!invoiceNeeded(values.needInvoice, config)) return {};
	const shown: BillingColumnValues =
		config.mode === "FREE_TEXT"
			? { billingText: values.billingText || undefined }
			: {};
	for (const { column } of activeBillingFields(config)) {
		shown[column] = values[column] || undefined;
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
		values.vatId ? `VAT ID: ${values.vatId}` : undefined,
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
		vatId: values.vatId ?? "",
	};
}

export function billingColumnsToDb(values: BillingColumnValues) {
	return {
		billingText: values.billingText || null,
		billingOrganization: values.billingOrganization || null,
		billingStreet: values.billingStreet || null,
		billingPostalCode: values.billingPostalCode || null,
		billingCity: values.billingCity || null,
		vatId: values.vatId || null,
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
