import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/features/auth/server/middleware";
import { SUPPORTED_FILE_EXTENSIONS } from "@/features/settings/file-types";
import {
	getActiveSubmissionTypes,
	getSetting,
	getSettings,
} from "@/features/settings/server/settings";
import {
	createNewSubmission,
	getSubmissionById,
	getSubmissionsForUser,
	resubmitSubmission,
	type SubmissionDetail,
	submitConditionalRevision,
	submitDraft,
	type UserSubmission,
	updateDraftSubmission,
} from "@/features/submissions/server/submissions";
import {
	authorSchema,
	createDynamicSubmissionSchema,
	DEFAULT_VALIDATION_LIMITS,
	type ValidationLimits,
} from "@/features/submissions/validations";
import { logger } from "@/logger";
import { isDeadlinePassed } from "@/shared/lib/deadline";
import { prisma } from "@/shared/server/db.server";
import { getUploadedFile } from "@/shared/server/form-upload";

function isPrismaKnownError(
	err: unknown,
): err is { code: string; meta?: Record<string, unknown> } {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		typeof (err as { code: unknown }).code === "string"
	);
}

const inputSchema = z.object({
	type: z.enum(["ABSTRACT", "POSTER", "FULL_PAPER"]),
	title: z.string(),
	content: z.string(),
	authors: z.array(authorSchema),
	keywords: z.array(z.string()),
	contentFormat: z.enum(["TEXT", "FILE"]),
	trackId: z.uuid().nullish(),
	isDraft: z.boolean().optional(),
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
			"ENABLE_KEYWORDS",
		]);
		return {
			minTitleLength: settings.MIN_TITLE_LENGTH,
			maxTitleLength: settings.MAX_TITLE_LENGTH,
			minAbstractLength: settings.MIN_ABSTRACT_LENGTH,
			maxAbstractLength: settings.MAX_ABSTRACT_LENGTH,
			minKeywords: settings.MIN_KEYWORDS,
			maxKeywords: settings.MAX_KEYWORDS,
			enableKeywords: settings.ENABLE_KEYWORDS,
		};
	} catch {
		// Fallback to defaults if settings not available
		return DEFAULT_VALIDATION_LIMITS;
	}
}

export const createSubmission = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(inputSchema)
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		const [submissionDeadline, submissionsLocked, timezone, lateAllowed] =
			await Promise.all([
				getSetting("SUBMISSION_DEADLINE"),
				getSetting("SUBMISSIONS_LOCKED"),
				getSetting("CONFERENCE_TIMEZONE"),
				prisma.user
					.findUnique({
						where: { id: context.user.id },
						select: { allowLateSubmission: true },
					})
					.then((u) => u?.allowLateSubmission ?? false),
			]);
		if (!lateAllowed) {
			if (submissionsLocked) {
				return {
					success: false,
					error: "Submissions are currently closed by the administrator",
				};
			}
			if (
				submissionDeadline &&
				isDeadlinePassed(submissionDeadline, timezone, new Date())
			) {
				return {
					success: false,
					error: "The submission deadline has passed",
				};
			}
		}

		const activeTypes = await getActiveSubmissionTypes();
		if (!activeTypes.some((t) => t.type === data.type)) {
			return {
				success: false,
				error: "Selected submission type is not active",
			};
		}

		if (!data.isDraft) {
			const limits = await getValidationLimits();
			const dynamicSchema = createDynamicSubmissionSchema(limits);
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
		}

		try {
			const submission = await createNewSubmission(
				data,
				context.user.id,
				data.isDraft,
			);
			return { success: true, id: submission.id };
		} catch (err) {
			logger.error("[createSubmission] failed", {
				userId: context.user.id,
				type: data.type,
				contentFormat: data.contentFormat,
				isDraft: !!data.isDraft,
				titleLen: data.title.length,
				contentLen: data.content.length,
				authorsCount: data.authors.length,
				keywordsCount: data.keywords.length,
				err,
			});
			if (isPrismaKnownError(err) && err.code === "P2002") {
				return {
					success: false,
					error:
						"A conflicting record exists. Please contact support if this persists.",
				};
			}
			return {
				success: false,
				error: "Server error while creating submission. Please try again.",
			};
		}
	});

/**
 * Best-effort kick-off of version-diff normalization for a diffable revision
 * (DOCX or PDF, v2+). Normalizes the new version AND its predecessor so the lazy
 * redline has both sides; a v1 / single-version submission is never normalized
 * (no diff to make). Kept out of the upload handler so it stays under the
 * complexity threshold; never throws (the worker is idempotent + content-addressed).
 */
async function maybeEnqueueDiffNormalize(
	ext: string,
	input: {
		submissionId: string;
		currentVersionNumber: number;
		storageKey: string;
		fileName: string;
		fileId: string;
	},
): Promise<void> {
	if ((ext !== "docx" && ext !== "pdf") || input.currentVersionNumber <= 1) {
		return;
	}
	const { enqueueRevisionNormalize } = await import(
		"@/features/submission-diff/server/enqueue-revision"
	);
	await enqueueRevisionNormalize({
		submissionId: input.submissionId,
		currentVersionNumber: input.currentVersionNumber,
		current: {
			storageKey: input.storageKey,
			fileName: input.fileName,
			fileId: input.fileId,
		},
	}).catch(() => {});
}

/** File upload endpoint for FILE-based submissions */
export const uploadSubmissionFile = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator((data: FormData) =>
		z
			.object({
				submissionId: z.uuid(),
				versionNumber: z.coerce.number().int().positive(),
				file: z.instanceof(File),
			})
			.parse({
				submissionId: data.get("submissionId"),
				versionNumber: data.get("versionNumber"),
				file: getUploadedFile(data),
			}),
	)
	// fallow-ignore-next-line complexity -- pre-existing upload handler, re-flagged on edit
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		// Dynamic import to avoid loading storage module when not needed
		const { uploadFile, generateSubmissionFileKey, generateAuthorFileName } =
			await import("@/shared/server/storage");
		const { fileToBuffer } = await import("@/shared/server/form-upload");
		const { prisma } = await import("@/shared/server/db.server");

		// Verify submission belongs to user
		const submission = await prisma.submission.findFirst({
			where: { id: data.submissionId, userId: context.user.id },
			include: {
				currentVersion: true,
				authors: {
					select: { firstName: true, lastName: true },
					orderBy: { orderIndex: "asc" },
				},
			},
		});

		if (!submission) {
			return { success: false, error: "Submission not found" };
		}

		const fileName = data.file.name;
		const buffer = await fileToBuffer(data.file);

		// Validate the real file type by magic number against the allowed
		// extensions for this submission's type — never trust the client mime.
		const { validateUpload, UploadValidationError } = await import(
			"@/shared/server/validate-upload"
		);
		const activeTypes = await getActiveSubmissionTypes();
		const typeConfig = activeTypes.find(
			(t) => t.type === submission.type,
		)?.config;
		const allowedExtensions =
			typeConfig && typeConfig.allowedExtensions.length > 0
				? typeConfig.allowedExtensions
				: SUPPORTED_FILE_EXTENSIONS;
		const maxBytes = (typeConfig?.maxFileSizeMb ?? 10) * 1024 * 1024;

		let detected: { ext: string; mime: string };
		try {
			detected = await validateUpload(buffer, { allowedExtensions, maxBytes });
		} catch (error) {
			if (error instanceof UploadValidationError) {
				return { success: false, error: error.message };
			}
			throw error;
		}

		// Display name shown in the system reflects the authors, not the uploaded
		// file name. The S3 key and fileName keep the real uploaded name.
		const dotIndex = fileName.lastIndexOf(".");
		const uploadedExt =
			dotIndex >= 0 ? fileName.slice(dotIndex + 1) : detected.ext;
		const displayName =
			submission.authors.length > 0
				? generateAuthorFileName(submission.authors, uploadedExt)
				: fileName;

		// Generate storage key
		const storageKey = generateSubmissionFileKey(
			data.submissionId,
			data.versionNumber,
			fileName,
		);

		// Upload to S3 with the detected (trustworthy) mime type
		await uploadFile(buffer, storageKey, detected.mime);

		// Create file record
		const file = await prisma.file.create({
			data: {
				entityType: "SUBMISSION_VERSION",
				entityId: submission.currentVersion?.id ?? submission.id,
				type: "SUBMISSION_MAIN",
				storageKey,
				fileName,
				originalName: displayName,
				mimeType: detected.mime,
				size: buffer.length,
				uploadedById: context.user.id,
			},
		});

		// Update submission version with file reference
		if (submission.currentVersion) {
			// Delete old file if re-uploading
			if (submission.currentVersion.fileId) {
				const oldFile = await prisma.file.findUnique({
					where: { id: submission.currentVersion.fileId },
					select: { storageKey: true },
				});
				if (oldFile) {
					const { deleteFile: deleteS3File } = await import(
						"@/shared/server/storage"
					);
					await deleteS3File(oldFile.storageKey).catch(() => {});
					await prisma.file.delete({
						where: { id: submission.currentVersion.fileId },
					});
				}
			}
			await prisma.submissionVersion.update({
				where: { id: submission.currentVersion.id },
				data: { fileId: file.id },
			});

			await maybeEnqueueDiffNormalize(detected.ext, {
				submissionId: data.submissionId,
				currentVersionNumber: submission.currentVersion.version,
				storageKey,
				fileName,
				fileId: file.id,
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
	.validator(z.object({ submissionId: z.uuid() }))
	.handler(async ({ data, context }): Promise<SubmissionDetail | null> => {
		return getSubmissionById(data.submissionId, context.user.id);
	});

/** Resubmit a submission with revisions */
export const resubmitSubmissionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			submissionId: z.uuid(),
			title: z.string(),
			content: z.string(),
			comment: z.string().optional(),
			authors: z.array(authorSchema),
			keywords: z.array(z.string()),
		}),
	)
	.handler(
		async ({
			data,
			context,
		}): Promise<{
			success: boolean;
			versionNumber: number;
			error?: string;
		}> => {
			return resubmitSubmission(data.submissionId, context.user.id, {
				title: data.title,
				content: data.content,
				comment: data.comment,
				authors: data.authors,
				keywords: data.keywords,
			});
		},
	);

/** Submit a revised version while conditionally accepted (no new review round) */
export const submitConditionalRevisionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			submissionId: z.uuid(),
			title: z.string(),
			content: z.string(),
			comment: z.string().optional(),
			authors: z.array(authorSchema),
			keywords: z.array(z.string()),
		}),
	)
	.handler(
		async ({
			data,
			context,
		}): Promise<{
			success: boolean;
			versionNumber: number;
			error?: string;
		}> => {
			return submitConditionalRevision(data.submissionId, context.user.id, {
				title: data.title,
				content: data.content,
				comment: data.comment,
				authors: data.authors,
				keywords: data.keywords,
			});
		},
	);

/** Update a draft/submitted submission */
export const updateDraftSubmissionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			submissionId: z.uuid(),
			type: z.enum(["ABSTRACT", "POSTER", "FULL_PAPER"]),
			title: z.string(),
			content: z.string(),
			authors: z.array(authorSchema),
			keywords: z.array(z.string()),
			contentFormat: z.enum(["TEXT", "FILE"]),
			trackId: z.uuid().nullish(),
			isDraft: z.boolean().optional(),
		}),
	)
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		const activeTypes = await getActiveSubmissionTypes();
		if (!activeTypes.some((t) => t.type === data.type)) {
			return {
				success: false,
				error: "Selected submission type is not active",
			};
		}

		if (!data.isDraft) {
			const limits = await getValidationLimits();
			const dynamicSchema = createDynamicSubmissionSchema(limits);
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
		}

		try {
			const updateResult = await updateDraftSubmission(
				data.submissionId,
				context.user.id,
				data,
			);
			if (!updateResult.success) {
				return { success: false, error: updateResult.error ?? "Update failed" };
			}
			return { success: true, id: data.submissionId };
		} catch (err) {
			logger.error("[updateDraftSubmission] failed", {
				userId: context.user.id,
				submissionId: data.submissionId,
				type: data.type,
				contentFormat: data.contentFormat,
				isDraft: !!data.isDraft,
				titleLen: data.title.length,
				contentLen: data.content.length,
				authorsCount: data.authors.length,
				keywordsCount: data.keywords.length,
				err,
			});
			if (isPrismaKnownError(err) && err.code === "P2002") {
				return {
					success: false,
					error:
						"A conflicting record exists. Please contact support if this persists.",
				};
			}
			return {
				success: false,
				error: "Server error while updating submission. Please try again.",
			};
		}
	});

/** Submit a draft (DRAFT → SUBMITTED) */
export const submitDraftFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ submissionId: z.uuid() }))
	.handler(
		async ({
			data,
			context,
		}): Promise<{ success: boolean; error?: string }> => {
			try {
				return await submitDraft(data.submissionId, context.user.id);
			} catch (err) {
				logger.error("[submitDraft] failed", {
					userId: context.user.id,
					submissionId: data.submissionId,
					err,
				});
				return {
					success: false,
					error: "Server error while submitting draft. Please try again.",
				};
			}
		},
	);

export const mySubmissionsQueryOptions = () =>
	queryOptions({
		queryKey: ["submissions", "mine"],
		queryFn: () => getMySubmissionsFn(),
	});

export const submissionDetailQueryOptions = (submissionId: string) =>
	queryOptions({
		queryKey: ["submissions", "detail", submissionId],
		queryFn: () => getSubmissionByIdFn({ data: { submissionId } }),
	});

/** Invalidates the caches a submission mutation affects (its detail + my list). */
export function invalidateSubmissionCaches(
	queryClient: QueryClient,
	submissionId: string,
): Promise<unknown> {
	return Promise.all([
		queryClient.invalidateQueries({
			queryKey: submissionDetailQueryOptions(submissionId).queryKey,
		}),
		queryClient.invalidateQueries({
			queryKey: mySubmissionsQueryOptions().queryKey,
		}),
	]);
}

// Re-export types for use in components
export type {
	UserSubmission,
	UserSubmissionAuthor,
	UserSubmissionDecision,
	UserSubmissionFile,
	UserSubmissionReview,
	UserSubmissionStatusHistory,
	UserSubmissionVersion,
} from "@/features/submissions/server/submissions";
