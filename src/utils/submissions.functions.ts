import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	createDynamicSubmissionSchema,
	DEFAULT_VALIDATION_LIMITS,
	type ValidationLimits,
} from "@/lib/validations/submission";
import { authMiddleware } from "./auth.middleware";
import { getSettings } from "./settings.server";
import {
	createNewSubmission,
	getSubmissionById,
	getSubmissionsForUser,
	type SubmissionDetail,
	type UserSubmission,
} from "./submissions.server";

const inputSchema = z.object({
	type: z.enum(["ABSTRACT", "POSTER", "FULL_PAPER"]),
	title: z.string(),
	content: z.string(),
	authors: z.array(z.any()),
	keywords: z.array(z.string()),
	contentFormat: z.enum(["TEXT", "FILE"]),
	// File upload handled separately via FormData
});

export type SubmissionResult =
	| { success: true; id: string }
	| {
			success: false;
			error: string;
			issues?: Array<{ path: string[]; message: string }>;
	  };

/** Fetches validation limits from database settings */
async function getValidationLimits(): Promise<ValidationLimits> {
	try {
		const settings = await getSettings([
			"MIN_TITLE_LENGTH",
			"MAX_TITLE_LENGTH",
			"MIN_ABSTRACT_LENGTH",
			"MAX_ABSTRACT_LENGTH",
			"MIN_KEYWORDS",
			"MAX_KEYWORDS",
			"MAX_AUTHORS",
			"ENABLE_KEYWORDS",
		]);
		return {
			minTitleLength: settings.MIN_TITLE_LENGTH,
			maxTitleLength: settings.MAX_TITLE_LENGTH,
			minAbstractLength: settings.MIN_ABSTRACT_LENGTH,
			maxAbstractLength: settings.MAX_ABSTRACT_LENGTH,
			minKeywords: settings.MIN_KEYWORDS,
			maxKeywords: settings.MAX_KEYWORDS,
			maxAuthors: settings.MAX_AUTHORS,
			enableKeywords: settings.ENABLE_KEYWORDS,
		};
	} catch {
		// Fallback to defaults if settings not available
		return DEFAULT_VALIDATION_LIMITS;
	}
}

export const createSubmission = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(inputSchema)
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		// Fetch validation limits from database
		const limits = await getValidationLimits();

		// Create dynamic schema with current settings
		const dynamicSchema = createDynamicSubmissionSchema(limits);

		// Validate with dynamic schema
		const result = dynamicSchema.safeParse(data);
		if (!result.success) {
			return {
				success: false,
				error: "Validation failed",
				issues: result.error.issues.map((issue) => ({
					path: issue.path.map(String),
					message: issue.message,
				})),
			};
		}

		const submission = await createNewSubmission(result.data, context.user.id);
		return { success: true, id: submission.id };
	});

/** File upload endpoint for FILE-based submissions */
export const uploadSubmissionFile = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.string().uuid(),
			versionNumber: z.number().int().positive(),
			fileName: z.string(),
			mimeType: z.string(),
			fileBase64: z.string(), // Base64 encoded file content
		}),
	)
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		// Dynamic import to avoid loading storage module when not needed
		const { uploadFile, generateSubmissionFileKey } = await import(
			"@/lib/server/storage"
		);
		const { prisma } = await import("@/db");

		// Verify submission belongs to user
		const submission = await prisma.submission.findFirst({
			where: { id: data.submissionId, userId: context.user.id },
			include: { currentVersion: true },
		});

		if (!submission) {
			return { success: false, error: "Submission not found" };
		}

		// Convert base64 to buffer
		const buffer = Buffer.from(data.fileBase64, "base64");

		// Generate storage key
		const storageKey = generateSubmissionFileKey(
			data.submissionId,
			data.versionNumber,
			data.fileName,
		);

		// Upload to S3
		await uploadFile(buffer, storageKey, data.mimeType);

		// Create file record
		const file = await prisma.file.create({
			data: {
				entityType: "SUBMISSION_VERSION",
				entityId: submission.currentVersion?.id ?? submission.id,
				type: "SUBMISSION_MAIN",
				storageKey,
				fileName: data.fileName,
				originalName: data.fileName,
				mimeType: data.mimeType,
				size: buffer.length,
				uploadedById: context.user.id,
			},
		});

		// Update submission version with file reference
		if (submission.currentVersion) {
			await prisma.submissionVersion.update({
				where: { id: submission.currentVersion.id },
				data: { fileId: file.id },
			});
		}

		return { success: true, id: file.id };
	});

/** Get current user's submissions */
export const getMySubmissionsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }): Promise<UserSubmission[]> => {
		return getSubmissionsForUser(context.user.id);
	});

/** Get single submission by ID (must belong to current user) */
export const getSubmissionByIdFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator(z.object({ submissionId: z.string().uuid() }))
	.handler(async ({ data, context }): Promise<SubmissionDetail | null> => {
		return getSubmissionById(data.submissionId, context.user.id);
	});

// Re-export types for use in components
export type {
	SubmissionDetail,
	UserSubmission,
	UserSubmissionAuthor,
	UserSubmissionDecision,
	UserSubmissionReview,
	UserSubmissionStatusHistory,
	UserSubmissionVersion,
} from "./submissions.server";
