import { z } from "zod";

export const conferenceSettingsSchema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	location: z.string().max(200),
	website: z.url("Invalid URL").or(z.literal("")),
	contactEmail: z.email("Invalid email").or(z.literal("")),
	conferenceStartDate: z.string(),
	conferenceEndDate: z.string(),
	submissionDeadline: z.string(),
	reviewDeadline: z.string(),
	notificationDate: z.string(),
	subtitle: z.string(),
});

export const submissionSettingsSchema = z.object({
	maxAbstractLength: z.number().min(100).max(10000),
	maxAuthors: z.number().min(1).max(50),
	maxFileSize: z.number().min(1).max(100),
	allowedFileTypes: z.array(z.string()),
	requireOrcid: z.boolean(),
	enableKeywords: z.boolean(),
	maxKeywords: z.number().min(1).max(20),
});

export const submissionTypeSettingsSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	enabled: z.boolean(),
	minReviewers: z.number().min(1).max(10),
	maxReviewers: z.number().min(1).max(10),
	reviewMode: z.enum(["open", "single-blind", "double-blind"]),
	reviewDeadlineDays: z.number().min(1).max(90),
	requiresEditorDecision: z.boolean(),
	autoTransition: z.boolean(),
	allowRevisions: z.boolean(),
	enableScoring: z.boolean(),
	scoringCriteria: z.array(z.string()),
});

export const emailTemplateSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	subject: z.string().min(1, "Subject is required").max(200),
	body: z.string().min(1, "Body is required"),
	cc: z.string(),
	bcc: z.string(),
	enabled: z.boolean(),
	placeholders: z.array(z.string()),
});

export const brandingSettingsSchema = z.object({
	logoUrl: z.string(),
	primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
	secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
	footerText: z.string().max(500),
	faviconUrl: z.string(),
});

export type ConferenceSettingsFormData = z.infer<
	typeof conferenceSettingsSchema
>;
export type SubmissionSettingsFormData = z.infer<
	typeof submissionSettingsSchema
>;
export type SubmissionTypeSettingsFormData = z.infer<
	typeof submissionTypeSettingsSchema
>;
export type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;
export type BrandingSettingsFormData = z.infer<typeof brandingSettingsSchema>;
