import { z } from "zod";

export const loginSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
	rememberMe: z.boolean(),
});

// Exported so register.tsx can derive per-field validators (registerBase.shape.*)
export const registerBase = z.object({
	email: z.email("Invalid email address"),
	password: z
		.string()
		.min(1, "Password is required")
		.min(10, "Password must be at least 10 characters"),
	confirmPassword: z.string().min(1, "Please confirm your password"),
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	title: z.string(),
	affiliationId: z.string().min(1, "Affiliation is required"),
	affiliationName: z.string(),
	needInvoice: z.boolean(),
	address: z.string(),
	country: z.string().min(1, "Country is required"),
	surveyAnswers: z.record(z.string(), z.string()),
	contactConsent: z.boolean(),
	acceptTerms: z
		.boolean()
		.refine((val) => val === true, "You must accept the Terms of Service"),
});

// Full-form safety net (form onSubmit). Per-step + match + async-email checks
// run as field-level validators in register.tsx.
export const registerSchema = registerBase.refine(
	(data) => data.password === data.confirmPassword,
	{
		message: "Passwords do not match",
		path: ["confirmPassword"],
	},
);

export const forgotPasswordSchema = z.object({
	email: z.email("Invalid email address"),
});

// Password match is enforced by PasswordFieldsGroup (field-level validator).
export const resetPasswordSchema = z.object({
	newPassword: z
		.string()
		.min(1, "Password is required")
		.min(10, "Password must be at least 10 characters"),
	confirmPassword: z.string().min(1, "Please confirm your password"),
});
