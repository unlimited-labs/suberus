export type ReviewMode = "open" | "single-blind" | "double-blind";

export interface ConferenceSettings {
	name: string;
	location: string;
	website: string;
	contactEmail: string;
	// Dates
	conferenceStartDate: string;
	conferenceEndDate: string;
	submissionDeadline: string;
	reviewDeadline: string;
	notificationDate: string;
}

export interface SubmissionSettings {
	maxAbstractLength: number;
	maxAuthors: number;
	maxFileSize: number; // MB
	allowedFileTypes: string[];
	requireOrcid: boolean;
	enableKeywords: boolean;
	maxKeywords: number;
}

export interface SubmissionTypeSettings {
	id: string;
	name: string;
	enabled: boolean;
	minReviewers: number;
	maxReviewers: number;
	reviewMode: ReviewMode;
	reviewDeadlineDays: number;
	requiresEditorDecision: boolean;
	autoTransition: boolean;
	// Revisions
	allowRevisions: boolean;
	// Scoring
	enableScoring: boolean;
	scoringCriteria: string[];
}

export interface EmailTemplate {
	id: string;
	name: string;
	subject: string;
	body: string;
	cc: string;
	bcc: string;
	enabled: boolean;
	placeholders: string[];
}

// Default mock data
export const defaultConferenceSettings: ConferenceSettings = {
	name: "ICSE 2026 - International Conference on Software Engineering",
	location: "Krakow, Poland",
	website: "https://icse2026.example.com",
	contactEmail: "contact@icse2026.example.com",
	conferenceStartDate: "2026-05-15",
	conferenceEndDate: "2026-05-18",
	submissionDeadline: "2026-02-01",
	reviewDeadline: "2026-03-15",
	notificationDate: "2026-04-01",
};

export const defaultSubmissionSettings: SubmissionSettings = {
	maxAbstractLength: 500,
	maxAuthors: 10,
	maxFileSize: 10,
	allowedFileTypes: ["pdf", "docx", "doc"],
	requireOrcid: false,
	enableKeywords: true,
	maxKeywords: 5,
};

export const defaultSubmissionTypes: SubmissionTypeSettings[] = [
	{
		id: "abstract",
		name: "Abstract",
		enabled: true,
		minReviewers: 2,
		maxReviewers: 3,
		reviewMode: "double-blind",
		reviewDeadlineDays: 14,
		requiresEditorDecision: true,
		autoTransition: false,
		allowRevisions: true,

		enableScoring: true,
		scoringCriteria: ["Originality", "Clarity", "Significance", "Methodology"],
	},
	{
		id: "full-paper",
		name: "Full Paper",
		enabled: true,
		minReviewers: 3,
		maxReviewers: 4,
		reviewMode: "double-blind",
		reviewDeadlineDays: 21,
		requiresEditorDecision: true,
		autoTransition: false,
		allowRevisions: true,

		enableScoring: true,
		scoringCriteria: [
			"Originality",
			"Clarity",
			"Significance",
			"Methodology",
			"Technical Quality",
		],
	},
	{
		id: "poster",
		name: "Poster",
		enabled: true,
		minReviewers: 1,
		maxReviewers: 2,
		reviewMode: "single-blind",
		reviewDeadlineDays: 7,
		requiresEditorDecision: false,
		autoTransition: true,
		allowRevisions: false,

		enableScoring: false,
		scoringCriteria: [],
	},
];

export const defaultEmailTemplates: EmailTemplate[] = [
	{
		id: "submission-confirmation",
		name: "Submission Confirmation",
		subject: "Submission Confirmation - {{submission_title}}",
		body: `Dear {{author_name}},

Thank you for submitting "{{submission_title}}" to {{conference_name}}.

Submission ID: {{submission_id}}
Submission Date: {{submission_date}}

You will be notified about the review status by {{notification_date}}.

Best regards,
Organizing Committee`,
		cc: "",
		bcc: "archive@icse2026.example.com",
		enabled: true,
		placeholders: [
			"{{author_name}}",
			"{{submission_title}}",
			"{{conference_name}}",
			"{{submission_id}}",
			"{{submission_date}}",
			"{{notification_date}}",
		],
	},
	{
		id: "review-invitation",
		name: "Review Invitation",
		subject: "Review Invitation - {{conference_name}}",
		body: `Dear {{reviewer_name}},

We invite you to review the paper "{{submission_title}}" for {{conference_name}}.

Review deadline: {{review_deadline}}

To accept or decline this invitation, please click: {{invitation_link}}

Best regards,
Program Committee`,
		cc: "",
		bcc: "",
		enabled: true,
		placeholders: [
			"{{reviewer_name}}",
			"{{submission_title}}",
			"{{conference_name}}",
			"{{review_deadline}}",
			"{{invitation_link}}",
		],
	},
	{
		id: "decision-accept",
		name: "Decision - Acceptance",
		subject: "Paper Decision - Acceptance",
		body: `Dear {{author_name}},

We are pleased to inform you that your paper "{{submission_title}}" has been accepted for {{conference_name}}.

{{editor_comments}}

Please submit the camera-ready version by {{camera_ready_deadline}}.

Best regards,
Program Committee`,
		cc: "",
		bcc: "",
		enabled: true,
		placeholders: [
			"{{author_name}}",
			"{{submission_title}}",
			"{{conference_name}}",
			"{{editor_comments}}",
			"{{camera_ready_deadline}}",
		],
	},
	{
		id: "decision-reject",
		name: "Decision - Rejection",
		subject: "Paper Decision - Rejection",
		body: `Dear {{author_name}},

Thank you for submitting your paper "{{submission_title}}" to {{conference_name}}.

Unfortunately, after careful evaluation by the reviewers, we must inform you that your paper has not been accepted for presentation.

{{editor_comments}}

We encourage you to submit to future editions of the conference.

Best regards,
Program Committee`,
		cc: "",
		bcc: "",
		enabled: true,
		placeholders: [
			"{{author_name}}",
			"{{submission_title}}",
			"{{conference_name}}",
			"{{editor_comments}}",
		],
	},
	{
		id: "revision-request",
		name: "Revision Request",
		subject: "Revision Request - {{submission_title}}",
		body: `Dear {{author_name}},

The reviewers of your paper "{{submission_title}}" recommend revisions.

{{revision_comments}}

Deadline for submitting the revised version: {{revision_deadline}}

Best regards,
Program Committee`,
		cc: "",
		bcc: "",
		enabled: true,
		placeholders: [
			"{{author_name}}",
			"{{submission_title}}",
			"{{revision_comments}}",
			"{{revision_deadline}}",
		],
	},
];

// Review mode labels
export const reviewModeLabels: Record<ReviewMode, string> = {
	open: "Open",
	"single-blind": "Single-blind",
	"double-blind": "Double-blind",
};
