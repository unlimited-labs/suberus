import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	adminOnlyMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import {
	getActiveSubmissionTypes,
	getSetting,
} from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import { submissionKeys } from "@/features/submissions/api/admin-submissions";
import {
	attachFileToVersion,
	checkEmailVerified,
	checkSubmissionWindow,
	createSubmissionOfFormat,
	type SubmissionResult,
	toSubmissionError,
	validateSubmissionInput,
	validateUploadFile,
} from "@/features/submissions/server/create-submission";
import {
	checkSubmissionLimit,
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
	submissionCreateInput,
	submissionIdInput,
} from "@/features/submissions/validations";
import { logger } from "@/logger";
import { prisma } from "@/shared/server/db.server";
import { getUploadedFile } from "@/shared/server/form-upload";

export type { SubmissionResult };

function formText(value: FormDataEntryValue | null): string | null {
	return value instanceof File ? null : value;
}

function parseCreateSubmissionFormData(data: FormData) {
	const authorsRaw = data.get("authors");
	const keywordsRaw = data.get("keywords");
	const trackId = data.get("trackId");
	const file = data.get("file");
	return submissionCreateInput.parse({
		type: data.get("type"),
		title: data.get("title"),
		content: data.get("content"),
		acknowledgment: formText(data.get("acknowledgment")) ?? "",
		authors: JSON.parse(formText(authorsRaw) ?? "[]"),
		keywords: JSON.parse(formText(keywordsRaw) ?? "[]"),
		contentFormat: data.get("contentFormat"),
		trackId: formText(trackId) || null,
		isDraft: data.get("isDraft") === "true",
		file: file instanceof File ? file : null,
	});
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
			return await createSubmissionOfFormat(data, context.user.id);
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
			return toSubmissionError(err, "creating submission");
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
			return await createSubmissionOfFormat(
				input,
				targetUserId,
				context.user.id,
			);
		} catch (err) {
			logger.error("[adminCreateSubmission] failed", {
				adminUserId: context.user.id,
				targetUserId,
				type: input.type,
				contentFormat: input.contentFormat,
				isDraft: !!input.isDraft,
				err,
			});
			return toSubmissionError(err, "creating submission");
		}
	});

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

export const getMySubmissionsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }): Promise<UserSubmission[]> => {
		return getSubmissionsForUser(context.user.id);
	});

export const getSubmissionByIdFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(submissionIdInput)
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

function parseRevisionFormData(data: FormData) {
	const authorsRaw = data.get("authors");
	const keywordsRaw = data.get("keywords");
	const comment = data.get("comment");
	const file = data.get("file");
	return revisionInputSchema.parse({
		submissionId: data.get("submissionId"),
		title: data.get("title"),
		content: data.get("content"),
		comment: formText(comment) || undefined,
		authors: JSON.parse(formText(authorsRaw) ?? "[]"),
		keywords: JSON.parse(formText(keywordsRaw) ?? "[]"),
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

export const updateDraftSubmissionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		submissionCreateInput.omit({ file: true }).extend(submissionIdInput.shape),
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
			const invalid = await validateSubmissionInput(data);
			if (invalid) return invalid;
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
			return toSubmissionError(err, "updating submission");
		}
	});

export const submitDraftFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(submissionIdInput)
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
		queryKey: [...submissionKeys.all, "mine"],
		queryFn: () => getMySubmissionsFn(),
	});

export const submissionDetailQueryOptions = (submissionId: string) =>
	queryOptions({
		queryKey: [...submissionKeys.all, "detail", submissionId],
		queryFn: () => getSubmissionByIdFn({ data: { submissionId } }),
	});

export async function invalidateSubmissionCaches(
	queryClient: QueryClient,
	submissionId: string,
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: submissionDetailQueryOptions(submissionId).queryKey,
		}),
		queryClient.invalidateQueries({
			queryKey: mySubmissionsQueryOptions().queryKey,
		}),
	]);
}

export type {
	UserSubmission,
	UserSubmissionAuthor,
	UserSubmissionDecision,
	UserSubmissionFile,
	UserSubmissionReview,
	UserSubmissionStatusHistory,
	UserSubmissionVersion,
} from "@/features/submissions/server/submissions";
