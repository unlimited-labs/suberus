import { z } from "zod";

export const trackFormSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Track name is required")
		.max(200, "Track name must be at most 200 characters"),
	supervisorId: z.string(),
	isActive: z.boolean(),
});

export type TrackFormValues = z.infer<typeof trackFormSchema>;
