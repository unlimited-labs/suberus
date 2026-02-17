import { z } from "zod";

const installBase = z.object({
	conferenceName: z.string().min(1, "Conference name is required").max(200),
	email: z.email("Invalid email address"),
	password: z
		.string()
		.min(1, "Password is required")
		.min(10, "Password must be at least 10 characters"),
	confirmPassword: z.string().min(1, "Please confirm your password"),
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	affiliation: z.string().min(1, "Affiliation is required"),
});

export const installSchema = installBase.refine(
	(data) => data.password === data.confirmPassword,
	{
		message: "Passwords do not match",
		path: ["confirmPassword"],
	},
);

export type InstallFormData = z.infer<typeof installSchema>;
