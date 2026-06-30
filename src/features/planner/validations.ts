import { z } from "zod";

// Client-side schemas mirroring the server validators in
// server-fns/planner/sessions.ts and server-fns/planner/breaks.ts.
// roomId/trackId are kept as plain nullable strings (always sourced from
// loaded room/track lists) — uuid checks live on the server.

export const sessionFormSchema = z.object({
	title: z.string().max(300, "Title must be at most 300 characters"),
	roomId: z.string().nullable(),
	trackId: z.string().nullable(),
	slotMin: z
		.number()
		.int()
		.min(1, "Slot must be at least 1 minute")
		.max(480, "Slot must be at most 480 minutes"),
});

export const eventFormSchema = z
	.object({
		type: z.enum(["session", "break", "event"]),
		title: z.string().max(300, "Title must be at most 300 characters"),
		startInput: z.string().min(1, "Start time is required"),
		endInput: z.string(),
		description: z.string().max(2000, "Description is too long"),
		location: z.string().max(200, "Location is too long"),
		locationUrl: z.string().max(2000, "Link is too long"),
		roomId: z.string().nullable(),
		trackId: z.string().nullable(),
		presentationCount: z.number().int().min(1, "At least 1 presentation"),
		minutesPerPresentation: z.number().int().min(1, "At least 1 minute"),
		breakDurationMin: z
			.number()
			.int()
			.min(5, "Break must be at least 5 minutes")
			.max(180, "Break must be at most 180 minutes"),
	})
	.refine((v) => v.type === "session" || v.title.trim().length > 0, {
		message: "Title is required",
		path: ["title"],
	})
	.refine((v) => v.type !== "event" || v.endInput.length > 0, {
		message: "End time is required",
		path: ["endInput"],
	})
	.refine(
		(v) => v.type !== "event" || !v.endInput || v.endInput > v.startInput,
		{ message: "End must be after start", path: ["endInput"] },
	);

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
export type EventFormValues = z.infer<typeof eventFormSchema>;
