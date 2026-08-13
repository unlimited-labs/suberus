import { getSetting } from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import { attachFileToVersion } from "@/features/submissions/server/create-submission";
import { readUploadToken } from "@/features/submissions/server/upload-link";
import { prisma } from "@/shared/server/db.server";

export async function acceptUpload(
	token: string,
	file: File,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
	const parsed = readUploadToken(token);
	if (!parsed.ok) {
		return parsed.error === "expired"
			? { ok: false, error: "This upload link has expired", status: 410 }
			: { ok: false, error: "This upload link is not valid", status: 403 };
	}

	const submission = await prisma.submission.findUnique({
		where: { id: parsed.submissionId },
		select: {
			id: true,
			type: true,
			status: true,
			userId: true,
			currentVersion: { select: { version: true } },
		},
	});

	// Draft only: once it is in review, replacing the file behind everyone's
	// back must not be possible.
	if (submission?.status !== "DRAFT") {
		return {
			ok: false,
			error: "This submission no longer accepts a file",
			status: 409,
		};
	}

	// A TEXT type has nowhere to show a file; attaching one would leave a record
	// no screen reads.
	const config = await getSetting(SUBMISSION_TYPE_TO_KEY[submission.type]);
	if (config.contentFormat !== "FILE") {
		return {
			ok: false,
			error: "This submission type is written text, not an uploaded file",
			status: 409,
		};
	}

	const attached = await attachFileToVersion({
		submissionId: submission.id,
		versionNumber: submission.currentVersion?.version ?? 1,
		file,
		// The file belongs to the author, whoever ran the upload.
		userId: submission.userId,
		enforceOwnership: false,
	});

	return attached.success
		? { ok: true }
		: { ok: false, error: attached.error, status: 400 };
}
