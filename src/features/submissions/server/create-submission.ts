import { SUPPORTED_FILE_EXTENSIONS } from "@/features/settings/file-types";
import {
	getActiveSubmissionTypes,
	getSetting,
	getSettings,
} from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import { enqueueRevisionNormalize } from "@/features/submission-diff/server/enqueue-revision";
import {
	createNewSubmission,
	submitDraft,
} from "@/features/submissions/server/submissions";
import {
	createDynamicSubmissionSchema,
	DEFAULT_VALIDATION_LIMITS,
	type SubmissionCreateInput,
	type ValidationLimits,
} from "@/features/submissions/validations";
import { logger } from "@/logger";
import { isDeadlinePassed } from "@/shared/lib/deadline";
import { prisma } from "@/shared/server/db.server";
import { fileToBuffer } from "@/shared/server/form-upload";
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

export function isPrismaKnownError(
	err: unknown,
): err is { code: string; meta?: Record<string, unknown> } {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		typeof (err as { code: unknown }).code === "string"
	);
}

export interface SubmissionFailure {
	success: false;
	error: string;
	issues?: Array<{ path: string[]; message: string }>;
}

export type SubmissionResult =
	| { success: true; id: string }
	| SubmissionFailure;

export function toSubmissionError(
	err: unknown,
	verb: string,
): SubmissionFailure {
	if (isPrismaKnownError(err) && err.code === "P2002") {
		return {
			success: false,
			error:
				"A conflicting record exists. Please contact support if this persists.",
		};
	}
	return {
		success: false,
		error: `Server error while ${verb}. Please try again.`,
	};
}

/** Fetches validation limits from database settings */
export async function getValidationLimits(): Promise<ValidationLimits> {
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
	} catch (err) {
		// submissions_requirements reports these to an agent as conference policy,
		// so a silent fallback would look authoritative.
		logger.error("[getValidationLimits] settings unreadable, using defaults", {
			err,
		});
		return DEFAULT_VALIDATION_LIMITS;
	}
}

/**
 * Submission-window gate: returns an error message when submitting is blocked
 * (admin lock, or deadline passed), or null when allowed. Users flagged for late
 * submission bypass both checks. Drafts still go through the caller's own path.
 */
export async function checkSubmissionWindow(
	userId: string,
): Promise<string | null> {
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
export async function checkEmailVerified(
	userId: string,
): Promise<string | null> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { emailVerified: true },
	});
	if (user?.emailVerified) return null;
	return "You need to verify your email address before working on submissions";
}

/** Validate a non-draft payload against the dynamic schema; failure result or null. */
export async function validateSubmissionInput(
	data: SubmissionCreateInput,
): Promise<SubmissionFailure | null> {
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
export async function createFileSubmission(
	data: SubmissionCreateInput,
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

/** The FILE/TEXT fork every create path shares; the gates around it differ. */
export async function createSubmissionOfFormat(
	data: SubmissionCreateInput,
	ownerId: string,
	performedById: string = ownerId,
): Promise<SubmissionResult> {
	if (data.contentFormat === "FILE") {
		return createFileSubmission(data, ownerId, performedById);
	}
	const submission = await createNewSubmission(
		data,
		ownerId,
		data.isDraft,
		performedById,
	);
	return { success: true, id: submission.id };
}

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
export async function validateUploadFile(
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
export async function attachFileToVersion(params: {
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
	// Validate the real file type by magic number against the allowed
	// extensions for this submission's type — never trust the client mime.
	const [buffer, activeTypes] = await Promise.all([
		fileToBuffer(file),
		getActiveSubmissionTypes(),
	]);
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
