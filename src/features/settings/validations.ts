import { z } from "zod";
import { SUPPORTED_FILE_EXTENSIONS } from "@/features/settings/file-types";
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

export const submissionValidationSettingsSchema = z
	.object({
		minTitleLength: z.number().int().min(1).max(500),
		maxTitleLength: z.number().int().min(10).max(1000),
		minAbstractLength: z.number().int().min(0).max(10000),
		maxAbstractLength: z.number().int().min(100).max(50000),
		minKeywords: z.number().int().min(0).max(20),
		maxKeywords: z.number().int().min(1).max(20),
		enableKeywords: z.boolean(),
	})
	.superRefine((v, ctx) => {
		if (v.minTitleLength > v.maxTitleLength) {
			ctx.addIssue({
				code: "custom",
				message: "Min title length cannot exceed max title length",
			});
		}
		if (v.minAbstractLength > v.maxAbstractLength) {
			ctx.addIssue({
				code: "custom",
				message: "Min abstract length cannot exceed max abstract length",
			});
		}
		if (v.minKeywords > v.maxKeywords) {
			ctx.addIssue({
				code: "custom",
				message: "Min keywords cannot exceed max keywords",
			});
		}
	});

export const submissionTypeConfigSchema = z
	.object({
		isActive: z.boolean(),
		includeInPlanner: z.boolean(),
		allowExhibitorPresentation: z.boolean(),
		contentFormat: z.enum(["TEXT", "FILE"]),
		allowedExtensions: z.array(z.enum(SUPPORTED_FILE_EXTENSIONS)).max(1),
		maxFileSizeMb: z.number().int().min(1).max(100),
		maxSubmissionsPerUser: z.number().int().min(0).max(1000),
		requiredReviewers: z.number().int().min(0).max(10),
		reviewMode: z.enum(["OPEN", "SINGLE_BLIND", "DOUBLE_BLIND"]),
		reviewDeadlineDays: z.number().int().min(1).max(90),
		requiresEditorDecision: z.boolean(),
		enableScoring: z.boolean(),
		scoringCriteria: z.array(
			z.object({ name: z.string(), description: z.string() }),
		),
		enableConfidenceLevel: z.boolean(),
		enableReviewAttachment: z.boolean(),
		enableTrackSelection: z.boolean(),
	})
	.superRefine((v, ctx) => {
		if (v.contentFormat === "FILE" && v.allowedExtensions.length === 0) {
			ctx.addIssue({
				code: "custom",
				message: "FILE format requires at least one allowed extension",
			});
		}
		if (v.enableScoring && v.scoringCriteria.length === 0) {
			ctx.addIssue({
				code: "custom",
				message: "Scoring requires at least one criterion",
			});
		}
	});

export const submissionTypeKeys = [
	"SUBMISSION_TYPE_ORAL_PRESENTATION",
	"SUBMISSION_TYPE_POSTER",
	"SUBMISSION_TYPE_FULL_PAPER",
	"SUBMISSION_TYPE_EXHIBITOR",
] as const;

/** EXHIBITOR is never reviewed, so it alone may keep zero required reviewers. */
export const submissionTypeUpdateSchema = z
	.object({
		type: z.enum(submissionTypeKeys),
		config: submissionTypeConfigSchema,
	})
	.superRefine((v, ctx) => {
		if (
			v.type !== "SUBMISSION_TYPE_EXHIBITOR" &&
			v.config.requiredReviewers < 1
		) {
			ctx.addIssue({
				code: "custom",
				message: "At least one reviewer is required",
			});
		}
	});

/**
 * Allowlist for the generic single-setting endpoint: every reachable key is
 * paired with its value schema, so an unlisted key is rejected outright.
 */
export const setSettingSchema = z.discriminatedUnion("key", [
	z.object({ key: z.literal("FEE_ENABLED"), value: z.boolean() }),
	z.object({ key: z.literal("FINANCES_ENABLED"), value: z.boolean() }),
	z.object({ key: z.literal("PROGRAM_THEME"), value: z.string().max(100) }),
	z.object({ key: z.literal("PROGRAM_SHOW_AUTHOR_INFO"), value: z.boolean() }),
	z.object({
		key: z.literal("INVITATION_VALIDITY_HOURS"),
		value: z.number().int().min(1).max(8760),
	}),
]);

export const invitationSettingsFormSchema = z.object({
	validityHours: wholeNumber(
		z
			.number()
			.int()
			.min(1, "Must be at least 1 hour")
			.max(8760, "At most 8760 hours (one year)"),
	),
});

export type InvitationSettingsFormValues = z.input<
	typeof invitationSettingsFormSchema
>;
