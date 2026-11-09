import { z } from "zod";
import { isViesCheckable, normalizeVatId } from "@/shared/lib/vat-id";

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

export const BILLING_FIELD_KEYS = [
	...STRUCTURED_BILLING_FIELDS.map((f) => f.key),
	VAT_ID_FIELD.key,
];

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
	registryCheck: z.boolean(),
	organizerVatId: z.string().transform((value, ctx) => {
		const result = normalizeVatId(value);
		if ("error" in result) {
			ctx.addIssue({ code: "custom", message: result.error });
			return z.NEVER;
		}
		if (result.value && !isViesCheckable(result.value)) {
			ctx.addIssue({
				code: "custom",
				message: "Use an EU or Northern Ireland (XI) VAT ID",
			});
			return z.NEVER;
		}
		return result.value;
	}),
});

export type BillingFieldState = z.infer<
	typeof billingFieldConfigSchema
>["state"];

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
	registryCheck: true,
	organizerVatId: "",
};
