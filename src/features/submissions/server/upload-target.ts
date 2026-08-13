import { getSetting } from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import { attachFileToVersion } from "@/features/submissions/server/create-submission";
import { readUploadToken } from "@/features/submissions/server/upload-link";
import { prisma } from "@/shared/server/db.server";

/**
 * Draft only: once it is in review, replacing the file behind everyone's back
 * must not be possible. A TEXT type has nowhere to show a file either.
 */
export async function assertAcceptsFile(submissionId: string) {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: {
			id: true,
			type: true,
			status: true,
			userId: true,
			currentVersion: { select: { version: true } },
		},
	});
	if (!submission) throw new Response("Submission not found", { status: 404 });
	if (submission.status !== "DRAFT") {
		throw new Response("Only a draft accepts a new file", { status: 409 });
	}

	const config = await getSetting(SUBMISSION_TYPE_TO_KEY[submission.type]);
	if (config.contentFormat !== "FILE") {
		throw new Response(`${submission.type} is a text type — it takes no file`, {
			status: 409,
		});
	}

	return submission;
}

export async function acceptUpload(token: string, file: File): Promise<void> {
	const parsed = readUploadToken(token);
	if (!parsed.ok) {
		throw parsed.error === "expired"
			? new Response("This upload link has expired", { status: 410 })
			: new Response("This upload link is not valid", { status: 403 });
	}

	const submission = await assertAcceptsFile(parsed.submissionId);

	const attached = await attachFileToVersion({
		submissionId: submission.id,
		versionNumber: submission.currentVersion?.version ?? 1,
		file,
		// The file belongs to the author, whoever ran the upload.
		userId: submission.userId,
		enforceOwnership: false,
	});

	if (!attached.success) throw new Response(attached.error, { status: 400 });
}
