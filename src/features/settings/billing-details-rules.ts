import type { z } from "zod";
import type { VatIdCheck } from "@/generated/prisma/client";
import type { BillingAuditField } from "@/shared/lib/billing-changes";
import {
	activeBillingFields,
	BILLING_FIELD_KEYS,
	BILLING_TEXT_NAME,
	STRUCTURED_BILLING_FIELDS,
	VAT_ID_FIELD,
	type BillingCatalogueColumn,
	type BillingDetailsSettings,
	type BillingFieldState,
} from "./billing-details-schema";

export interface BillingColumnValues {
	billingText?: string | null;
	billingOrganization?: string | null;
	billingStreet?: string | null;
	billingPostalCode?: string | null;
	billingCity?: string | null;
	vatId?: string | null;
}

export const EMPTY_BILLING_FIELDS = {
	needInvoice: false,
	billingText: "",
	billingOrganization: "",
	billingStreet: "",
	billingPostalCode: "",
	billingCity: "",
	vatId: "",
	country: "",
};

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

export type InvoiceState = "NONE" | "REQUESTED" | "INCOMPLETE";

export function invoiceState(
	values: BillingValues,
	config: BillingDetailsSettings,
): InvoiceState {
	if (!invoiceNeeded(values.needInvoice, config)) return "NONE";
	return billingDetailsIssues(values, config).length > 0
		? "INCOMPLETE"
		: "REQUESTED";
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

type RegistryDetails = Pick<
	VatIdCheck,
	"status" | "registryName" | "registryAddress"
>;

function splitRegistryAddress(address: string | null) {
	const lines = address?.split("\n").map((line) => line.trim()) ?? [];
	const postalLine =
		lines.length > 1 ? /^(\S*\d\S*)\s+(.+)$/.exec(lines.at(-1) ?? "") : null;
	return {
		billingStreet: (postalLine ? lines.slice(0, -1) : lines).join(", "),
		billingPostalCode: postalLine?.[1] ?? "",
		billingCity: postalLine?.[2] ?? "",
	};
}

export const FILLABLE_BILLING_COLUMNS = [
	"billingText",
	"billingOrganization",
	"billingStreet",
	"billingPostalCode",
	"billingCity",
	"vatId",
] as const;

export function registryFill(
	values: BillingColumnValues,
	config: BillingDetailsSettings,
	registry: RegistryDetails | null | undefined,
): BillingColumnValues {
	if (registry?.status !== "VERIFIED") return {};
	const text = [registry.registryName, registry.registryAddress]
		.filter(Boolean)
		.join("\n");
	if (!text) return {};
	if (config.mode === "FREE_TEXT") {
		return values.billingText?.trim() ? {} : { billingText: text };
	}
	return fillEmptyActiveFields(values, config, {
		billingOrganization: registry.registryName ?? "",
		...splitRegistryAddress(registry.registryAddress),
	});
}

/** Only the active form's empty fields take a found value; nothing typed is overwritten. */
export function fillEmptyActiveFields(
	values: BillingColumnValues,
	config: BillingDetailsSettings,
	found: BillingColumnValues,
): BillingColumnValues {
	const fill: BillingColumnValues = {};
	for (const { column } of activeBillingFields(config)) {
		if (!values[column]?.trim() && found[column]) fill[column] = found[column];
	}
	return fill;
}

export function showsPreviousText(
	values: BillingColumnValues,
	config: BillingDetailsSettings,
): boolean {
	return (
		config.mode === "STRUCTURED" &&
		Boolean(values.billingText?.trim()) &&
		STRUCTURED_BILLING_FIELDS.every(
			(f) => config.fields[f.key].state === "OFF" || !values[f.column]?.trim(),
		)
	);
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

export function becomesStricter(
	saved: BillingDetailsSettings,
	draft: BillingDetailsSettings,
): boolean {
	if (draft.invoiceRequired && !saved.invoiceRequired) return true;
	return BILLING_FIELD_KEYS.some(
		(key) =>
			draft.fields[key].state === "REQUIRED" &&
			saved.fields[key].state !== "REQUIRED",
	);
}

/** Only what decides Incomplete, so editing a label keeps the count query key stable. */
export function requirednessOf(
	config: BillingDetailsSettings,
): BillingDetailsSettings {
	const blank = (state: BillingFieldState) => ({ state, label: "", help: "" });
	return {
		invoiceRequired: config.invoiceRequired,
		mode: config.mode,
		text: { label: "", help: "" },
		fields: {
			organizationName: blank(config.fields.organizationName.state),
			streetAddress: blank(config.fields.streetAddress.state),
			postalCode: blank(config.fields.postalCode.state),
			city: blank(config.fields.city.state),
			vatId: blank(config.fields.vatId.state),
		},
		organizerVatId: "",
	};
}

const PREVIOUS_TEXT = {
	column: "billingText",
	name: "Billing details (text)",
} as const;

export function previousFormValues(
	values: BillingColumnValues,
	config: BillingDetailsSettings,
) {
	const active = new Set(activeBillingFields(config).map((f) => f.column));
	const outside = [
		...(config.mode === "STRUCTURED" ? [PREVIOUS_TEXT] : []),
		...[...STRUCTURED_BILLING_FIELDS, VAT_ID_FIELD].filter(
			(f) => !active.has(f.column),
		),
	];
	return outside.flatMap(({ column, name }) => {
		const value = values[column]?.trim();
		return value ? [{ column, name, value }] : [];
	});
}

function composeBillingText({
	billingOrganization,
	billingStreet,
	billingPostalCode,
	billingCity,
}: BillingColumnValues): string {
	return buyerLines({
		billingOrganization,
		billingStreet,
		billingPostalCode,
		billingCity,
	}).join("\n");
}

/** Simple mode with no text yet starts from the separate fields, so nothing typed earlier is lost. */
export function initialBillingText(
	values: BillingValues,
	config: BillingDetailsSettings,
): string {
	if (values.billingText) return values.billingText;
	return config.mode === "FREE_TEXT" &&
		invoiceNeeded(values.needInvoice, config)
		? composeBillingText(values)
		: "";
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

export const BILLING_AUDIT_LABELS = {
	needInvoice: "Invoice needed",
	billingText: BILLING_TEXT_NAME,
	billingOrganization: "Organization name",
	billingStreet: "Street address",
	billingPostalCode: "Postal code",
	billingCity: "City",
	vatId: "VAT ID",
	country: "Country",
} satisfies Record<BillingAuditField, string>;
