import { z } from "zod";
import type { Author } from "@/shared/types/author";

export const authorSchema = z.object({
	firstName: z
		.string()
		.min(1, "First name is required")
		.max(100, "First name must be at most 100 characters"),
	lastName: z
		.string()
		.min(1, "Last name is required")
		.max(100, "Last name must be at most 100 characters"),
	email: z.email("Invalid email address"),
	affiliationId: z.uuid().nullable(),
	affiliationName: z.string().min(1, "Affiliation is required"),
	isPresenter: z.boolean(),
}) satisfies z.ZodType<Author>;
