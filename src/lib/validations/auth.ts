import { z } from "zod"

export const loginSchema = z.object({
	email: z.string().min(1, "Email is required").email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
	rememberMe: z.boolean().optional().default(false),
})

export const registerSchema = z
	.object({
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
		email: z.string().min(1, "Email is required").email("Invalid email address"),
		password: z
			.string()
			.min(1, "Password is required")
			.min(10, "Password must be at least 10 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
		acceptTerms: z
			.boolean()
			.refine((val) => val === true, "You must accept the terms and conditions"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})

export const forgotPasswordSchema = z.object({
	email: z.string().min(1, "Email is required").email("Invalid email address"),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
