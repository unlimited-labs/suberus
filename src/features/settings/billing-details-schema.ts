import { z } from "zod";

export const BILLING_TEXT_NAME = "Billing details (organization)";

export const STRUCTURED_BILLING_FIELDS = [
	{
		key: "organizationName",
		column: "billingOrganization",
		name: "Organization name",
	},
	{ key: "streetAddress", column: "billingStreet", name: "Street address" },
	{ key: "postalCode", column: "billingPostalCode", name: "Postal code" },
	{ key: "city", column: "billingCity", name: "City" },
] as const;

export const VAT_ID_FIELD = {
	key: "vatId",
	column: "vatId",
	name: "VAT ID",
} as const;

export type StructuredBillingField = (typeof STRUCTURED_BILLING_FIELDS)[number];
export type BillingCatalogueField =
	| StructuredBillingField
	| typeof VAT_ID_FIELD;
export type BillingCatalogueColumn = BillingCatalogueField["column"];

export function activeBillingFields(
	config: BillingDetailsSettings,
): BillingCatalogueField[] {
	const fields =
		config.mode === "STRUCTURED"
			? [...STRUCTURED_BILLING_FIELDS, VAT_ID_FIELD]
			: [VAT_ID_FIELD];
	return fields.filter((f) => config.fields[f.key].state !== "OFF");
}

const labelSchema = z
	.string()
	.trim()
	.max(60, "Label must be at most 60 characters");
const helpSchema = z
	.string()
	.trim()
	.max(300, "Help text must be at most 300 characters");

const billingFieldConfigSchema = z.object({
	state: z.enum(["OFF", "OPTIONAL", "REQUIRED"]),
	label: labelSchema,
	help: helpSchema,
});

export const billingDetailsSettingsSchema = z.object({
	invoiceRequired: z.boolean(),
	mode: z.enum(["FREE_TEXT", "STRUCTURED"]),
	text: z.object({ label: labelSchema, help: helpSchema }),
	fields: z.object({
		organizationName: billingFieldConfigSchema,
		streetAddress: billingFieldConfigSchema,
		postalCode: billingFieldConfigSchema,
		city: billingFieldConfigSchema,
		vatId: billingFieldConfigSchema,
	}),
	organizerVatId: z.string().trim().max(20),
});

export type BillingDetailsSettings = z.infer<
	typeof billingDetailsSettingsSchema
>;

const offField = { state: "OFF", label: "", help: "" } as const;

export const DEFAULT_BILLING_DETAILS: BillingDetailsSettings = {
	invoiceRequired: false,
	mode: "FREE_TEXT",
	text: { label: "", help: "" },
	fields: {
		organizationName: offField,
		streetAddress: offField,
		postalCode: offField,
		city: offField,
		vatId: offField,
	},
	organizerVatId: "",
};
