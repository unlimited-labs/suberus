import { z } from "zod";
import { zIanaTz } from "@/shared/lib/validations/zod-helpers";

export const conferenceSettingsSchema = z.object({
	name: z.string().min(1, "Name required").max(200),
	location: z.string().max(200),
	website: z.union([z.literal(""), z.httpUrl()]),
	contactEmail: z.union([z.literal(""), z.email()]),
	conferenceStartDate: z.string(),
	conferenceEndDate: z.string(),
	submissionDeadline: z.string(),
	submissionsLocked: z.boolean(),
	reviewDeadline: z.string(),
	notificationDate: z.string(),
	registrationDeadline: z.string(),
	registrationLocked: z.boolean(),
	subtitle: z.string(),
	dateFormat: z.string(),
	timeFormat: z.enum(["24h", "12h"]),
	currency: z.enum(["EUR", "USD", "PLN"]),
	timezone: zIanaTz,
	dayStart: z.iso.time({ precision: -1, error: "Expected HH:mm" }),
	dayEnd: z.iso.time({ precision: -1, error: "Expected HH:mm" }),
	defaultPresentationMin: z.number().int().min(5).max(480),
	autoplanEnabled: z.boolean(),
	authorBufferMin: z.number().int().min(0).max(240),
});

export const conferenceSettingsPatch = conferenceSettingsSchema.partial();

export type ConferenceSettings = z.infer<typeof conferenceSettingsSchema>;
