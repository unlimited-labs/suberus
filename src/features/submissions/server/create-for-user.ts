import { getActiveSubmissionTypes } from "@/features/settings/server/settings";
import {
	checkSubmissionWindow,
	createSubmissionOfFormat,
	validateSubmissionInput,
} from "@/features/submissions/server/create-submission";
import {
	checkSubmissionLimit,
	submitDraft,
} from "@/features/submissions/server/submissions";
import { issueUploadLink } from "@/features/submissions/server/upload-link";
import { assertAcceptsFile } from "@/features/submissions/server/upload-target";
import type { SubmissionCreateInput } from "@/features/submissions/validations";
import { prisma } from "@/shared/server/db.server";

/** Multipart POST target, field name `file`; the token is the whole authority. */
export interface UploadHandoff {
	url: string;
	expiresAt: Date;
}

export interface CreateForUserResult {
	id: string;
	status: "DRAFT" | "SUBMITTED";
	contentFormat: "TEXT" | "FILE";
	upload?: UploadHandoff;
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

	// Always, not just when submitting: a FILE type is necessarily born a draft,
	// so gating on isDraft would let an agent create something unvalidated and
	// then push it through submissions_submit_draft. An agent writes the whole
	// submission in one call, so there is no half-filled draft to preserve.
	const invalid = await validateSubmissionInput(payload);
	if (invalid) {
		const issues = (invalid.issues ?? [])
			.map((issue) => `${issue.path.join(".")} ${issue.message}`)
			.join("; ");
		throw new Response(`${invalid.error}: ${issues}`, { status: 400 });
	}

	const created = await createSubmissionOfFormat(
		payload,
		userId,
		performedById,
	);
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

	const upload = issueUploadLink(created.id);
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

export async function submitDraftOnBehalf(
	submissionId: string,
	performedById: string,
): Promise<{ success: boolean; error?: string }> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: { userId: true },
	});
	if (!submission) return { success: false, error: "Submission not found" };

	return submitDraft(submissionId, submission.userId, {
		enforceLimit: false,
		performedById,
	});
}

export async function submitDraftForUser(
	submissionId: string,
	performedById: string,
): Promise<{ id: string; status: "SUBMITTED" }> {
	const result = await submitDraftOnBehalf(submissionId, performedById);
	if (!result.success) {
		throw new Response(result.error ?? "Could not submit the draft", {
			status: 400,
		});
	}
	return { id: submissionId, status: "SUBMITTED" };
}

export async function issueUploadLinkForDraft(
	submissionId: string,
): Promise<UploadHandoff> {
	await assertAcceptsFile(submissionId);
	return issueUploadLink(submissionId);
}
