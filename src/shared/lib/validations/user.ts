import { z } from "zod";

// ORCID format: 0000-0000-0000-000X (where X can be 0-9 or X)
const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;

/**
 * User personal/contact data schemas. Shared because the same fields are edited
 * both self-service (profile) and by admins (users), so neither slice owns them.
 */
export const personalInfoSchema = z.object({
	title: z.string().optional(),
	firstName: z
		.string()
		.min(1, "First name is required")
		.min(2, "First name must be at least 2 characters")
		.max(50, "First name must be at most 50 characters"),
	lastName: z
		.string()
		.min(1, "Last name is required")
		.min(2, "Last name must be at least 2 characters")
		.max(50, "Last name must be at most 50 characters"),
	affiliation: z
		.string()
		.max(200, "Affiliation must be at most 200 characters")
		.optional(),
	orcid: z
		.string()
		.regex(orcidRegex, "Invalid ORCID format (e.g., 0000-0002-1825-0097)")
		.optional()
		.or(z.literal("")),
});

// needInvoice/address/country are always present in the form (defaulted), so
// they are required here — this lets BillingFieldsGroup map onto them.
export const contactInfoSchema = z.object({
	email: z.email("Invalid email address"),
	needInvoice: z.boolean(),
	address: z
		.string()
		.max(500, "Billing details must be at most 500 characters"),
	country: z.string(),
});

// Admin user edit combines personal + contact fields in a single form.
export const adminUserEditSchema = personalInfoSchema.extend(
	contactInfoSchema.shape,
);

export const adminUserCreateSchema = personalInfoSchema
	.omit({ orcid: true })
	.extend(contactInfoSchema.shape)
	.extend({ surveyAnswers: z.record(z.string(), z.string()) });

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
export type AdminUserCreateFormData = z.infer<typeof adminUserCreateSchema>;
export type ContactInfoFormData = z.infer<typeof contactInfoSchema>;
export type AdminUserEditFormData = z.infer<typeof adminUserEditSchema>;
