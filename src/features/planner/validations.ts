import { z } from "zod";
import { zDateString } from "@/shared/lib/validations/zod-helpers";

export const sessionFormSchema = z.object({
	title: z.string().max(300, "Title must be at most 300 characters"),
	roomId: z.string().nullable(),
	trackId: z.string().nullable(),
	slotMin: z
		.number()
		.int()
		.min(1, "Slot must be at least 1 minute")
		.max(480, "Slot must be at most 480 minutes"),
	untimedSlots: z.boolean(),
	sessionMin: z
		.number()
		.int()
		.min(5, "Session must be at least 5 minutes")
		.max(720, "Session must be at most 720 minutes"),
});

export function eventFormNeedsEnd(v: {
	type: "session" | "break" | "event";
	untimedSlots: boolean;
}) {
	return v.type === "event" || (v.type === "session" && v.untimedSlots);
}

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
		untimedSlots: z.boolean(),
	})
	.refine((v) => v.type === "session" || v.title.trim().length > 0, {
		message: "Title is required",
		path: ["title"],
	})
	.refine((v) => !eventFormNeedsEnd(v) || v.endInput.length > 0, {
		message: "End time is required",
		path: ["endInput"],
	})
	.refine(
		(v) => !eventFormNeedsEnd(v) || !v.endInput || v.endInput > v.startInput,
		{ message: "End must be after start", path: ["endInput"] },
	);

export const sessionEditSchema = z
	.object({
		title: z
			.string()
			.min(1, "Title is required")
			.max(300, "Title must be at most 300 characters"),
		startLocal: z.string().min(1, "Start time is required"),
		endLocal: z.string(),
		untimedSlots: z.boolean(),
		slotCount: z.number().int().min(1, "At least 1 presentation"),
		slotMin: z
			.number()
			.int()
			.min(1, "Slot must be at least 1 minute")
			.max(480, "Slot must be at most 480 minutes"),
		roomId: z.string().nullable(),
		trackId: z.string().nullable(),
	})
	.refine((v) => !v.untimedSlots || v.endLocal.length > 0, {
		message: "End time is required",
		path: ["endLocal"],
	})
	.refine((v) => !v.untimedSlots || !v.endLocal || v.endLocal > v.startLocal, {
		message: "End must be after start",
		path: ["endLocal"],
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
			z.httpUrl("Link must be a valid URL").max(2000, "Link is too long"),
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
	link: z.union([z.literal(""), z.httpUrl("Link must be a valid URL")]),
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
	dayStart: z.iso.time({ precision: -1, error: "Use HH:MM" }),
	dayEnd: z.iso.time({ precision: -1, error: "Use HH:MM" }),
	defaultPresentationMin: z
		.number()
		.int()
		.min(5, "At least 5 minutes")
		.max(480, "At most 480 minutes"),
	autoplanEnabled: z.boolean(),
	authorBufferMin: z
		.number()
		.int()
		.min(0, "At least 0 minutes")
		.max(240, "At most 240 minutes"),
	reminderLeadMin: z
		.number()
		.int()
		.min(1, "At least 1 minute")
		.max(120, "At most 120 minutes"),
});

export const programQrSettingsSchema = z.object({
	errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]),
	width: z
		.number()
		.int()
		.min(128, "At least 128 px")
		.max(2048, "At most 2048 px"),
	margin: z.number().int().min(0, "At least 0").max(16, "At most 16"),
	format: z.enum(["svg", "png"]),
	baseUrl: z.union([z.literal(""), z.httpUrl("Must be a valid URL")]),
	includeWithoutCameraReady: z.boolean(),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
export type EventFormValues = z.infer<typeof eventFormSchema>;

export const idInput = z.object({ id: z.uuid() });

const roomLinkInput = z
	.union([z.literal(""), z.httpUrl()])
	.nullable()
	.optional();

export const roomCreateInput = z.object({
	name: z.string().min(1).max(200),
	description: z.string().max(1000).nullable().optional(),
	link: roomLinkInput,
	order: z.number().int().nonnegative().optional(),
});

export const roomUpdateInput = roomCreateInput.partial().extend({
	id: z.uuid(),
});

const trackColorInput = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Color must be #RRGGBB")
	.nullable()
	.optional();

export const trackCreateInput = z.object({
	name: z.string().min(1).max(200),
	color: trackColorInput,
});

export const trackUpdateInput = z.object({
	id: z.uuid(),
	name: z.string().min(1).max(200).optional(),
	color: trackColorInput,
});

export const sessionCreateInput = z.object({
	title: z.string().max(300).optional(),
	trackId: z.uuid().nullable().optional(),
	roomId: z.uuid().nullable().optional(),
	startAt: zDateString,
	endAt: zDateString,
	untimedSlots: z.boolean().optional(),
});

export const sessionUpdateInput = z.object({
	id: z.uuid(),
	title: z.string().min(1).max(300).optional(),
	trackId: z.uuid().nullable().optional(),
	roomId: z.uuid().nullable().optional(),
	startAt: zDateString.optional(),
	endAt: zDateString.optional(),
	untimedSlots: z.boolean().optional(),
});

export const sessionMoveInput = z.object({
	id: z.uuid(),
	startAt: zDateString,
	endAt: zDateString,
	roomId: z.uuid().nullable().optional(),
});

export const sessionChairInput = z.object({
	sessionId: z.uuid(),
	userId: z.uuid(),
});

export const sessionWithPresentationsInput = sessionCreateInput.extend({
	slotDurationMin: z.number().int().min(1).max(480),
	submissionIds: z.array(z.uuid()).min(1),
});

export const sessionIdInput = z.object({ sessionId: z.uuid() });

export const sessionSplitInput = z.object({
	sessionId: z.uuid(),
	afterSlotOrder: z.number().int().min(0),
});

export const presentationCreateInput = z.object({
	sessionId: z.uuid(),
	submissionId: z.uuid(),
	durationMin: z.number().int().positive().max(600),
});

const invitedTalkText = {
	title: z.string().min(1, "Title is required").max(300),
	abstract: z.string().max(5000),
	speakerFirstName: z.string().max(100),
	speakerLastName: z.string().max(100),
	affiliationName: z.string().max(200),
};

const invitedTalkFields = z.object({
	title: invitedTalkText.title,
	abstract: invitedTalkText.abstract.nullish(),
	speakerFirstName: invitedTalkText.speakerFirstName.nullish(),
	speakerLastName: invitedTalkText.speakerLastName.nullish(),
	affiliationName: invitedTalkText.affiliationName.nullish(),
});

const speakerNameComplete = {
	message: "Provide both the speaker's first and last name, or neither",
	path: ["speakerLastName"],
};

function hasCompleteSpeakerName(v: {
	speakerFirstName?: string | null;
	speakerLastName?: string | null;
}): boolean {
	return !v.speakerFirstName?.trim() === !v.speakerLastName?.trim();
}

export const invitedTalkCreateInput = invitedTalkFields
	.extend({
		sessionId: z.uuid(),
		durationMin: z.number().int().positive().max(600),
	})
	.refine(hasCompleteSpeakerName, speakerNameComplete);

export const invitedTalkUpdateInput = invitedTalkFields
	.extend({
		id: z.uuid(),
		durationMin: z.number().int().positive().max(600).optional(),
	})
	.refine(hasCompleteSpeakerName, speakerNameComplete);

export const invitedTalkFormSchema = z
	.object({
		...invitedTalkText,
		durationMin: z.number().int().positive().max(600),
	})
	.refine(hasCompleteSpeakerName, speakerNameComplete);

export const presentationDurationInput = z.object({
	id: z.uuid(),
	durationMin: z.number().int().positive().max(600),
});

export const presentationCancelInput = z.object({
	id: z.uuid(),
	cancelled: z.boolean(),
});

export const presentationReorderInput = z.object({
	sessionId: z.uuid(),
	orderedIds: z.array(z.uuid()).min(1),
});

export const breakCreateInput = z.object({
	kind: z.enum(["BREAK", "EVENT"]).optional(),
	title: z.string().min(1).max(200),
	description: z.string().max(2000).nullable().optional(),
	location: z.string().max(200).nullable().optional(),
	locationUrl: z.httpUrl().max(2000).nullable().optional(),
	roomId: z.uuid().nullable().optional(),
	startAt: zDateString,
	endAt: zDateString,
});

export const breakUpdateInput = breakCreateInput
	.omit({ kind: true })
	.partial()
	.extend({ id: z.uuid() });

export const jobIdInput = z.object({ jobId: z.uuid() });

export const programRangeInput = z
	.object({
		day: z.iso.date().optional(),
		from: zDateString.optional(),
		to: zDateString.optional(),
	})
	.refine((v) => !(v.day && (v.from || v.to)), {
		message: "Pass either day or from/to, not both",
		path: ["day"],
	})
	.refine((v) => !(v.from && v.to) || v.from < v.to, {
		message: "from must be before to",
		path: ["to"],
	});
