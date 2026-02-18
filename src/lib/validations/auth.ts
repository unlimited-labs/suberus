import { z } from "zod";

export const loginSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
	rememberMe: z.boolean(),
});

const registerBase = z.object({
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
	address: z.string(),
	country: z.string().min(1, "Country is required"),
	surveyAnswers: z.record(z.string(), z.string()),
	acceptTerms: z
		.boolean()
		.refine((val) => val === true, "You must accept the Terms of Service"),
});

export const registerSchema = registerBase.refine(
	(data) => data.password === data.confirmPassword,
	{
		message: "Passwords do not match",
		path: ["confirmPassword"],
	},
);

/** Per-step schemas for multi-step validation */
export const registerStep1Base = z.object({
	email: z.email("Invalid email address"),
	password: z
		.string()
		.min(1, "Password is required")
		.min(10, "Password must be at least 10 characters"),
	confirmPassword: z.string().min(1, "Please confirm your password"),
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	affiliationId: z.string().min(1, "Affiliation is required"),
});

export const registerStep1Schema = registerStep1Base.refine(
	(data) => data.password === data.confirmPassword,
	{
		message: "Passwords do not match",
		path: ["confirmPassword"],
	},
);

export const registerStep2Schema = z.object({
	country: z.string().min(1, "Country is required"),
});

export const registerStep3Schema = z.object({
	acceptTerms: z
		.boolean()
		.refine((val) => val === true, "You must accept the Terms of Service"),
});

export const forgotPasswordSchema = z.object({
	email: z.email("Invalid email address"),
});

export const resetPasswordSchema = z
	.object({
		newPassword: z
			.string()
			.min(1, "Password is required")
			.min(10, "Password must be at least 10 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
