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

export const sessionEditSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.max(300, "Title must be at most 300 characters"),
	startLocal: z.string().min(1, "Start time is required"),
	slotCount: z.number().int().min(1, "At least 1 presentation"),
	slotMin: z
		.number()
		.int()
		.min(1, "Slot must be at least 1 minute")
		.max(480, "Slot must be at most 480 minutes"),
	roomId: z.string().nullable(),
	trackId: z.string().nullable(),
});

export const breakEditSchema = z
	.object({
		kind: z.enum(["BREAK", "EVENT"]),
		title: z
			.string()
			.min(1, "Title is required")
			.max(200, "Title must be at most 200 characters"),
		startLocal: z.string().min(1, "Start time is required"),
		endLocal: z.string(),
		durationMin: z.number().int().min(1, "Break must be at least 1 minute"),
		description: z.string().max(2000, "Description is too long"),
		location: z.string().max(200, "Location is too long"),
		locationUrl: z.union([
			z.literal(""),
			z.url("Link must be a valid URL").max(2000, "Link is too long"),
		]),
		roomId: z.string().nullable(),
	})
	.refine((v) => v.kind !== "EVENT" || v.endLocal.length > 0, {
		message: "End time is required",
		path: ["endLocal"],
	})
	.refine(
		(v) => v.kind !== "EVENT" || !v.endLocal || v.endLocal > v.startLocal,
		{ message: "End must be after start", path: ["endLocal"] },
	);

export const roomSchema = z.object({
	name: z
		.string()
		.min(1, "Room name is required")
		.max(200, "Name must be at most 200 characters"),
	description: z.string().max(1000, "Description is too long"),
	link: z.union([z.literal(""), z.url("Link must be a valid URL")]),
});

export const trackSchema = z.object({
	name: z
		.string()
		.min(1, "Track name is required")
		.max(200, "Name must be at most 200 characters"),
	color: z.union([
		z.literal(""),
		z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be #RRGGBB"),
	]),
});

export const plannerSettingsSchema = z.object({
	dayStart: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
	dayEnd: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
	defaultPresentationMin: z
		.number()
		.int()
		.min(5, "At least 5 minutes")
		.max(480, "At most 480 minutes"),
	autoplanEnabled: z.boolean(),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
export type EventFormValues = z.infer<typeof eventFormSchema>;
