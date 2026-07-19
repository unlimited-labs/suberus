import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	adminOnlyMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import { SUPPORTED_FILE_EXTENSIONS } from "@/features/settings/file-types";
import {
	getActiveSubmissionTypes,
	getSetting,
	getSettings,
} from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import { enqueueRevisionNormalize } from "@/features/submission-diff/server/enqueue-revision";
import {
	checkSubmissionLimit,
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
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";
import {
	deleteFile,
	generateAuthorFileName,
	generateSubmissionFileKey,
	uploadFile,
} from "@/shared/server/storage";
import {
	UploadValidationError,
	validateUpload,
} from "@/shared/server/validate-upload";

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
	// File travels with the create call (FormData) so a FILE submission can be
	// validated + attached atomically; optional for drafts.
	file: z.instanceof(File).nullish(),
});

type CreateSubmissionInput = z.infer<typeof inputSchema>;

/** Parse the create-submission multipart payload (JSON fields + optional file). */
function parseCreateSubmissionFormData(data: FormData) {
	const authorsRaw = data.get("authors");
	const keywordsRaw = data.get("keywords");
	const trackId = data.get("trackId");
	const file = data.get("file");
	return inputSchema.parse({
		type: data.get("type"),
		title: data.get("title"),
		content: data.get("content"),
		authors: JSON.parse(typeof authorsRaw === "string" ? authorsRaw : "[]"),
		keywords: JSON.parse(typeof keywordsRaw === "string" ? keywordsRaw : "[]"),
		contentFormat: data.get("contentFormat"),
		trackId: typeof trackId === "string" && trackId.length > 0 ? trackId : null,
		isDraft: data.get("isDraft") === "true",
		file: file instanceof File ? file : null,
	});
}

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

/**
 * Submission-window gate: returns an error message when submitting is blocked
 * (admin lock, or deadline passed), or null when allowed. Users flagged for late
 * submission bypass both checks. Drafts still go through the caller's own path.
 */
async function checkSubmissionWindow(userId: string): Promise<string | null> {
	const [submissionDeadline, submissionsLocked, timezone, lateAllowed] =
		await Promise.all([
			getSetting("SUBMISSION_DEADLINE"),
			getSetting("SUBMISSIONS_LOCKED"),
			getSetting("CONFERENCE_TIMEZONE"),
			prisma.user
				.findUnique({
					where: { id: userId },
					select: { allowLateSubmission: true },
				})
				.then((u) => u?.allowLateSubmission ?? false),
		]);
	if (lateAllowed) return null;
	if (submissionsLocked) {
		return "Submissions are currently closed by the administrator";
	}
	if (
		submissionDeadline &&
		isDeadlinePassed(submissionDeadline, timezone, new Date())
	) {
		return "The submission deadline has passed";
	}
	return null;
}

/** Server-side twin of SubmissionEmailGate, which only guards the create view. */
async function checkEmailVerified(userId: string): Promise<string | null> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { emailVerified: true },
	});
	if (user?.emailVerified) return null;
	return "You need to verify your email address before working on submissions";
}

/** Validate a non-draft payload against the dynamic schema; failure result or null. */
async function validateSubmissionInput(
	data: CreateSubmissionInput,
): Promise<SubmissionResult | null> {
	const limits = await getValidationLimits();
	const result = createDynamicSubmissionSchema(limits).safeParse(data);
	if (result.success) return null;
	return {
		success: false,
		error: "Validation failed",
		issues: result.error.issues.map((issue) => ({
			path: issue.path.map(String),
			message: issue.message,
		})),
	};
}

/**
 * Create a FILE-format submission. FILE submissions must carry a file before
 * they can be submitted, so we create as a draft, attach the file, then submit —
 * a FILE submission is never SUBMITTED without a file (drafts stay file-less).
 */
async function createFileSubmission(
	data: CreateSubmissionInput,
	userId: string,
	performedById: string = userId,
): Promise<SubmissionResult> {
	if (!data.isDraft && !data.file) {
		return {
			success: false,
			error: "A file is required.",
			issues: [{ path: ["file"], message: "A file is required." }],
		};
	}
	// Validate the file upfront so an invalid upload never creates a record.
	if (data.file) {
		const config = await getSetting(SUBMISSION_TYPE_TO_KEY[data.type]);
		const valid = await validateUploadFile(data.file, config);
		if (!valid.ok) return { success: false, error: valid.error };
	}
	const submission = await createNewSubmission(
		data,
		userId,
		true,
		performedById,
	);
	if (data.file) {
		const attached = await attachFileToVersion({
			submissionId: submission.id,
			versionNumber: 1,
			file: data.file,
			userId,
		});
		if (!attached.success) {
			return { success: false, error: attached.error };
		}
	}
	if (!data.isDraft) {
		const submitted = await submitDraft(submission.id, userId);
		if (!submitted.success) {
			return {
				success: false,
				error: submitted.error ?? "Failed to submit submission.",
			};
		}
	}
	return { success: true, id: submission.id };
}

export const createSubmission = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(parseCreateSubmissionFormData)
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		const unverified = await checkEmailVerified(context.user.id);
		if (unverified) return { success: false, error: unverified };

		const windowError = await checkSubmissionWindow(context.user.id);
		if (windowError) return { success: false, error: windowError };

		const activeTypes = await getActiveSubmissionTypes();
		if (!activeTypes.some((t) => t.type === data.type)) {
			return {
				success: false,
				error: "Selected submission type is not active",
			};
		}

		if (!data.isDraft) {
			const invalid = await validateSubmissionInput(data);
			if (invalid) return invalid;

			const limitError = await checkSubmissionLimit(context.user.id, data.type);
			if (limitError) return { success: false, error: limitError };
		}

		try {
			if (data.contentFormat === "FILE") {
				return await createFileSubmission(data, context.user.id);
			}
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

function parseAdminCreateSubmissionFormData(data: FormData) {
	return {
		...parseCreateSubmissionFormData(data),
		targetUserId: z.uuid().parse(data.get("targetUserId")),
	};
}

/** Admin/editor creates a submission owned by `targetUserId`; bypasses window + limit (admins trusted), logs the admin as performer. */
export const adminCreateSubmission = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(parseAdminCreateSubmissionFormData)
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		const { targetUserId, ...input } = data;

		const activeTypes = await getActiveSubmissionTypes();
		if (!activeTypes.some((t) => t.type === input.type)) {
			return {
				success: false,
				error: "Selected submission type is not active",
			};
		}

		if (!input.isDraft) {
			const invalid = await validateSubmissionInput(input);
			if (invalid) return invalid;
		}

		try {
			if (input.contentFormat === "FILE") {
				return await createFileSubmission(input, targetUserId, context.user.id);
			}
			const submission = await createNewSubmission(
				input,
				targetUserId,
				input.isDraft,
				context.user.id,
			);
			return { success: true, id: submission.id };
		} catch (err) {
			logger.error("[adminCreateSubmission] failed", {
				adminUserId: context.user.id,
				targetUserId,
				type: input.type,
				contentFormat: input.contentFormat,
				isDraft: !!input.isDraft,
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

/**
 * Magic-number validation of an uploaded file against a submission type's config.
 * Use it to reject before mutating any record; `attachFileToVersion` revalidates
 * on the actual upload path.
 */
async function validateUploadFile(
	file: File,
	config: { allowedExtensions: string[]; maxFileSizeMb?: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
	const allowedExtensions =
		config.allowedExtensions.length > 0
			? config.allowedExtensions
			: SUPPORTED_FILE_EXTENSIONS;
	const maxBytes = (config.maxFileSizeMb ?? 10) * 1024 * 1024;
	try {
		await validateUpload(await fileToBuffer(file), {
			allowedExtensions,
			maxBytes,
		});
		return { ok: true };
	} catch (error) {
		if (error instanceof UploadValidationError) {
			return { ok: false, error: error.message };
		}
		throw error;
	}
}

/**
 * Validates an uploaded buffer (by magic number) and attaches it to the
 * submission's current version: uploads to S3, creates the File record, swaps
 * out any previous file, and kicks off diff normalization. Shared by the
 * create, revise, and re-upload server fns so the file path lives in one place.
 */
// fallow-ignore-next-line complexity -- single owner of the upload pipeline; extracted from uploadSubmissionFile
async function attachFileToVersion(params: {
	submissionId: string;
	versionNumber: number;
	file: File;
	userId: string;
	/** Admins edit any submission; skip the owner check. */
	enforceOwnership?: boolean;
}): Promise<SubmissionResult> {
	const { submissionId, versionNumber, file, userId } = params;
	const enforceOwnership = params.enforceOwnership ?? true;

	const submission = await prisma.submission.findFirst({
		where: { id: submissionId, ...(enforceOwnership ? { userId } : {}) },
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

	const fileName = file.name;
	const buffer = await fileToBuffer(file);

	// Validate the real file type by magic number against the allowed
	// extensions for this submission's type — never trust the client mime.
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

	const storageKey = generateSubmissionFileKey(
		submissionId,
		versionNumber,
		fileName,
	);

	// Upload to S3 with the detected (trustworthy) mime type
	await uploadFile(buffer, storageKey, detected.mime);

	// Create file record
	const fileRecord = await prisma.file.create({
		data: {
			entityType: "SUBMISSION_VERSION",
			entityId: submission.currentVersion?.id ?? submission.id,
			type: "SUBMISSION_MAIN",
			storageKey,
			fileName,
			originalName: displayName,
			mimeType: detected.mime,
			size: buffer.length,
			uploadedById: userId,
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
				await deleteFile(oldFile.storageKey).catch(() => {});
				await prisma.file.delete({
					where: { id: submission.currentVersion.fileId },
				});
			}
		}
		await prisma.submissionVersion.update({
			where: { id: submission.currentVersion.id },
			data: { fileId: fileRecord.id },
		});

		await maybeEnqueueDiffNormalize(detected.ext, {
			submissionId,
			currentVersionNumber: submission.currentVersion.version,
			storageKey,
			fileName,
			fileId: fileRecord.id,
		});
	}

	return { success: true, id: fileRecord.id };
}

/** File upload endpoint for FILE-based submissions (re-upload on an existing draft). */
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
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		const unverified = await checkEmailVerified(context.user.id);
		if (unverified) return { success: false, error: unverified };

		// Not in attachFileToVersion: the revise paths share it and legitimately
		// attach to non-DRAFT submissions.
		const submission = await prisma.submission.findFirst({
			where: { id: data.submissionId, userId: context.user.id },
			select: { status: true },
		});
		if (!submission) {
			return { success: false, error: "Submission not found" };
		}
		if (submission.status !== "DRAFT") {
			return {
				success: false,
				error: "Can only edit submissions in DRAFT status",
			};
		}

		return attachFileToVersion({
			submissionId: data.submissionId,
			versionNumber: data.versionNumber,
			file: data.file,
			userId: context.user.id,
		});
	});

/** Admin-only file replacement — any submission, no owner check. */
export const adminUploadSubmissionFile = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
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
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		return attachFileToVersion({
			submissionId: data.submissionId,
			versionNumber: data.versionNumber,
			file: data.file,
			userId: context.user.id,
			enforceOwnership: false,
		});
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

const revisionInputSchema = z.object({
	submissionId: z.uuid(),
	title: z.string(),
	content: z.string(),
	comment: z.string().optional(),
	authors: z.array(authorSchema),
	keywords: z.array(z.string()),
	// A revision always carries its new file (FormData); required for FILE types.
	file: z.instanceof(File).nullish(),
});

/** Parse the revision multipart payload (JSON fields + new file). */
function parseRevisionFormData(data: FormData) {
	const authorsRaw = data.get("authors");
	const keywordsRaw = data.get("keywords");
	const comment = data.get("comment");
	const file = data.get("file");
	return revisionInputSchema.parse({
		submissionId: data.get("submissionId"),
		title: data.get("title"),
		content: data.get("content"),
		comment:
			typeof comment === "string" && comment.length > 0 ? comment : undefined,
		authors: JSON.parse(typeof authorsRaw === "string" ? authorsRaw : "[]"),
		keywords: JSON.parse(typeof keywordsRaw === "string" ? keywordsRaw : "[]"),
		file: file instanceof File ? file : null,
	});
}

type RevisionResult = {
	success: boolean;
	versionNumber: number;
	error?: string;
};

/**
 * Gates a revision on its file: FILE-format submissions require a valid new file
 * (validated upfront so we never transition to a file-less/invalid revision),
 * then runs the version-creating `run()` and attaches the file to it.
 */
async function reviseWithFile(
	submissionId: string,
	userId: string,
	file: File | null,
	run: () => Promise<RevisionResult>,
): Promise<RevisionResult> {
	const submission = await prisma.submission.findFirst({
		where: { id: submissionId, userId },
		select: { type: true },
	});
	if (!submission) {
		return { success: false, versionNumber: 0, error: "Submission not found" };
	}

	const config = await getSetting(SUBMISSION_TYPE_TO_KEY[submission.type]);
	if (config.contentFormat === "FILE") {
		if (!file) {
			return { success: false, versionNumber: 0, error: "A file is required." };
		}
		const valid = await validateUploadFile(file, config);
		if (!valid.ok) {
			return { success: false, versionNumber: 0, error: valid.error };
		}
	}

	const result = await run();
	if (!result.success) return result;

	if (file) {
		const attached = await attachFileToVersion({
			submissionId,
			versionNumber: result.versionNumber,
			file,
			userId,
		});
		if (!attached.success) {
			return {
				success: false,
				versionNumber: result.versionNumber,
				error: attached.error,
			};
		}
	}

	return result;
}

/** Resubmit a submission with revisions */
export const resubmitSubmissionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(parseRevisionFormData)
	.handler(async ({ data, context }): Promise<RevisionResult> => {
		return reviseWithFile(
			data.submissionId,
			context.user.id,
			data.file ?? null,
			() =>
				resubmitSubmission(data.submissionId, context.user.id, {
					title: data.title,
					content: data.content,
					comment: data.comment,
					authors: data.authors,
					keywords: data.keywords,
				}),
		);
	});

/** Submit a revised version while conditionally accepted (no new review round) */
export const submitConditionalRevisionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(parseRevisionFormData)
	.handler(async ({ data, context }): Promise<RevisionResult> => {
		return reviseWithFile(
			data.submissionId,
			context.user.id,
			data.file ?? null,
			() =>
				submitConditionalRevision(data.submissionId, context.user.id, {
					title: data.title,
					content: data.content,
					comment: data.comment,
					authors: data.authors,
					keywords: data.keywords,
				}),
		);
	});

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
		const unverified = await checkEmailVerified(context.user.id);
		if (unverified) return { success: false, error: unverified };

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
			const unverified = await checkEmailVerified(context.user.id);
			if (unverified) return { success: false, error: unverified };

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
