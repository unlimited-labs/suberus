import { z } from "zod";

export const BILLING_TEXT_NAME = "Billing details (organization)";

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
