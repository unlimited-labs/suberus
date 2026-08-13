import { SUPPORTED_FILE_EXTENSIONS } from "@/features/settings/file-types";
import { getSetting } from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import { attachFileToVersion } from "@/features/submissions/server/create-submission";
import { readUploadToken } from "@/features/submissions/server/upload-link";
import { prisma } from "@/shared/server/db.server";

export interface UploadTarget {
	title: string;
	type: string;
	allowedExtensions: string[];
	maxFileSizeMb: number;
	hasFile: boolean;
}

export type UploadTargetResult =
	| { ok: true; target: UploadTarget }
	| { ok: false; reason: "invalid" | "expired" | "gone" };

type ResolveFailure = { error: "invalid" | "expired" | "gone" };

async function resolve(token: string) {
	const parsed = readUploadToken(token);
	if (!parsed.ok) {
		const failure: ResolveFailure = {
			error: parsed.error === "expired" ? "expired" : "invalid",
		};
		return failure;
	}

	const submission = await prisma.submission.findUnique({
		where: { id: parsed.target.submissionId },
		select: {
			id: true,
			title: true,
			type: true,
			status: true,
			userId: true,
			currentVersion: { select: { version: true, fileId: true } },
		},
	});

	// A link stays usable only while the submission is still a draft: once it is
	// in review, replacing the file behind everyone's back must not be possible.
	if (submission?.status !== "DRAFT") {
		const failure: ResolveFailure = { error: "gone" };
		return failure;
	}

	return { submission, versionNumber: parsed.target.versionNumber };
}

export async function getUploadTarget(
	token: string,
): Promise<UploadTargetResult> {
	const resolved = await resolve(token);
	if ("error" in resolved) return { ok: false, reason: resolved.error };

	const config = await getSetting(
		SUBMISSION_TYPE_TO_KEY[resolved.submission.type],
	);
	return {
		ok: true,
		target: {
			title: resolved.submission.title,
			type: resolved.submission.type,
			allowedExtensions:
				config.allowedExtensions.length > 0
					? config.allowedExtensions
					: [...SUPPORTED_FILE_EXTENSIONS],
			maxFileSizeMb: config.maxFileSizeMb,
			hasFile: Boolean(resolved.submission.currentVersion?.fileId),
		},
	};
}

export async function acceptUpload(
	token: string,
	file: File,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
	const resolved = await resolve(token);
	if ("error" in resolved) {
		return resolved.error === "expired"
			? { ok: false, error: "This upload link has expired", status: 410 }
			: {
					ok: false,
					error: "This upload link is no longer valid",
					status: 410,
				};
	}

	const attached = await attachFileToVersion({
		submissionId: resolved.submission.id,
		versionNumber:
			resolved.submission.currentVersion?.version ?? resolved.versionNumber,
		file,
		// The file belongs to the author, whoever pasted the link around.
		userId: resolved.submission.userId,
		enforceOwnership: false,
	});

	return attached.success
		? { ok: true }
		: { ok: false, error: attached.error, status: 400 };
}
