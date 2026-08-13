import { getActiveSubmissionTypes } from "@/features/settings/server/settings";
import {
	checkSubmissionWindow,
	createFileSubmission,
	validateSubmissionInput,
} from "@/features/submissions/server/create-submission";
import {
	checkSubmissionLimit,
	createNewSubmission,
	submitDraft,
} from "@/features/submissions/server/submissions";
import { issueUploadLink } from "@/features/submissions/server/upload-link";
import type { SubmissionCreateInput } from "@/features/submissions/validations";
import { prisma } from "@/shared/server/db.server";

export interface CreateForUserResult {
	id: string;
	status: "DRAFT" | "SUBMITTED";
	contentFormat: "TEXT" | "FILE";
	upload?: { url: string; expiresAt: Date };
	warnings: string[];
}

/**
 * Creates a submission owned by `userId` on `performedById`'s authority. The
 * deadline and per-type limit are reported, not enforced — an organizer adding
 * a late entry by hand is the normal reason to be here — mirroring what
 * /admin/users/$id/submissions/new already does.
 */
export async function createSubmissionForUser(
	input: Omit<SubmissionCreateInput, "contentFormat" | "isDraft" | "file"> & {
		userId: string;
		submit: boolean;
	},
	performedById: string,
): Promise<CreateForUserResult> {
	const { userId, submit, ...content } = input;

	const author = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true },
	});
	if (!author) throw new Response("User not found", { status: 404 });

	const activeTypes = await getActiveSubmissionTypes();
	const active = activeTypes.find((t) => t.type === content.type);
	if (!active) {
		throw new Response(
			`Submission type ${content.type} is not active. Active: ${activeTypes.map((t) => t.type).join(", ") || "none"}`,
			{ status: 400 },
		);
	}

	const contentFormat = active.config.contentFormat;
	const warnings = (
		await Promise.all([
			checkSubmissionWindow(userId),
			checkSubmissionLimit(userId, content.type),
		])
	).filter((warning): warning is string => warning !== null);

	const payload: SubmissionCreateInput = {
		...content,
		contentFormat,
		// A FILE submission cannot be complete before its file arrives, so it is
		// always born a draft and only submitted once the upload lands.
		isDraft: contentFormat === "FILE" ? true : !submit,
		file: null,
	};

	if (!payload.isDraft) {
		const invalid = await validateSubmissionInput(payload);
		if (invalid && !invalid.success) {
			const issues = (invalid.issues ?? [])
				.map((issue) => `${issue.path.join(".")} ${issue.message}`)
				.join("; ");
			throw new Response(`${invalid.error}: ${issues}`, { status: 400 });
		}
	}

	const created =
		contentFormat === "FILE"
			? await createFileSubmission(payload, userId, performedById)
			: await createNewSubmission(
					payload,
					userId,
					payload.isDraft,
					performedById,
				).then((s) => ({ success: true as const, id: s.id }));

	if (!created.success) {
		throw new Response(created.error, { status: 400 });
	}

	if (contentFormat !== "FILE") {
		return {
			id: created.id,
			status: payload.isDraft ? "DRAFT" : "SUBMITTED",
			contentFormat,
			warnings,
		};
	}

	const upload = issueUploadLink({
		submissionId: created.id,
		versionNumber: 1,
	});
	return {
		id: created.id,
		status: "DRAFT",
		contentFormat,
		upload,
		warnings: submit
			? [
					...warnings,
					"A file is required before this submission can be sent; use the upload link, then submissions_submit_draft.",
				]
			: warnings,
	};
}

export async function submitDraftForUser(
	submissionId: string,
	performedById: string,
): Promise<{ id: string; status: "SUBMITTED" }> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: { userId: true },
	});
	if (!submission) throw new Response("Submission not found", { status: 404 });

	const result = await submitDraft(submissionId, submission.userId, {
		enforceLimit: false,
		performedById,
	});
	if (!result.success) {
		throw new Response(result.error ?? "Could not submit the draft", {
			status: 400,
		});
	}
	return { id: submissionId, status: "SUBMITTED" };
}

export async function issueUploadLinkForDraft(
	submissionId: string,
): Promise<{ url: string; expiresAt: Date }> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: {
			status: true,
			currentVersion: { select: { version: true } },
		},
	});
	if (!submission) throw new Response("Submission not found", { status: 404 });
	if (submission.status !== "DRAFT") {
		throw new Response("Only a draft accepts a new file", { status: 409 });
	}

	return issueUploadLink({
		submissionId,
		versionNumber: submission.currentVersion?.version ?? 1,
	});
}
