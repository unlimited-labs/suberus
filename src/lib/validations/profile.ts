import { z } from "zod";

// ORCID format: 0000-0000-0000-000X (where X can be 0-9 or X)
const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;

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

export const contactInfoSchema = z.object({
	email: z.email("Invalid email address"),
	address: z
		.string()
		.max(500, "Address must be at most 500 characters")
		.optional(),
	country: z.string().optional(),
});

export const passwordChangeSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z
			.string()
			.min(1, "New password is required")
			.min(10, "Password must be at least 10 characters"),
		confirmNewPassword: z.string().min(1, "Please confirm your new password"),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: "Passwords do not match",
		path: ["confirmNewPassword"],
	});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
export type ContactInfoFormData = z.infer<typeof contactInfoSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
