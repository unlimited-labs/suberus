import { z } from "zod";

export const loginSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
	rememberMe: z.boolean(),
});

export const forgotPasswordSchema = z.object({
	email: z.email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
	newPassword: z
		.string()
		.min(1, "Password is required")
		.min(10, "Password must be at least 10 characters"),
	confirmPassword: z.string().min(1, "Please confirm your password"),
});
