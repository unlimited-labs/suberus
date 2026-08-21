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
	reminderLeadMin: z.number().int().min(1).max(120),
});

export const conferenceSettingsPatch = conferenceSettingsSchema.partial();

export type ConferenceSettings = z.infer<typeof conferenceSettingsSchema>;

const reminderDaysBefore = z
	.array(
		z
			.number()
			.int()
			.min(1, "Days must be 1-365")
			.max(365, "Days must be 1-365"),
	)
	.min(1, "Enter at least one value")
	.max(10, "At most 10 values");

export const reminderSettingsSchema = z.object({
	reviewer: z.object({ enabled: z.boolean(), daysBefore: reminderDaysBefore }),
	revision: z.object({
		enabled: z.boolean(),
		intervalDays: z.number().int().min(1).max(365),
		maxCount: z.number().int().min(1).max(50),
	}),
	deadline: z.object({ enabled: z.boolean(), daysBefore: reminderDaysBefore }),
});

const wholeNumber = (bounds: z.ZodNumber) =>
	z
		.string()
		.trim()
		.refine((s) => /^\d+$/.test(s), "Enter a whole number")
		.transform(Number)
		.pipe(bounds);

const daysBeforeCsv = z
	.string()
	.transform((s) =>
		s
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean),
	)
	.refine(
		(tokens) => tokens.every((t) => /^\d+$/.test(t)),
		"Use whole numbers separated by commas",
	)
	.transform((tokens) => tokens.map(Number))
	.pipe(reminderDaysBefore);

/** Field ids double as form keys so the admin e2e selectors keep working. */
export const reminderFormSchema = z.object({
	"reviewer-enabled": z.boolean(),
	"reviewer-days": daysBeforeCsv,
	"revision-enabled": z.boolean(),
	"revision-interval": wholeNumber(z.number().int().min(1).max(365)),
	"revision-max": wholeNumber(z.number().int().min(1).max(50)),
	"deadline-enabled": z.boolean(),
	"deadline-days": daysBeforeCsv,
});

export type ReminderFormValues = z.input<typeof reminderFormSchema>;
