import { env } from "@/env";
import {
	createCapabilityToken,
	DOWNLOAD_LINK_TTL_MS,
	verifyCapabilityToken,
} from "@/features/submissions/server/capability-token";
import { prisma } from "@/shared/server/db.server";

async function currentVersionFile(submissionId: string) {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: {
			type: true,
			currentVersion: {
				select: {
					file: {
						select: {
							storageKey: true,
							originalName: true,
							mimeType: true,
							size: true,
						},
					},
				},
			},
		},
	});
	if (!submission) throw new Response("Submission not found", { status: 404 });

	const file = submission.currentVersion?.file;
	if (!file) {
		throw new Response(
			`No file on the current version of this ${submission.type} — a text type stores its abstract inline`,
			{ status: 404 },
		);
	}
	return file;
}

/**
 * Any status, unlike the upload link: a file already in review is exactly what
 * an audit needs to read.
 */
export async function issueDownloadLink(submissionId: string) {
	const file = await currentVersionFile(submissionId);
	const { token, expiresAt } = createCapabilityToken(
		"dl",
		submissionId,
		env.AUTH_SECRET,
		DOWNLOAD_LINK_TTL_MS,
	);
	return {
		url: `${env.APP_BASE_URL.replace(/\/$/, "")}/api/submissions/download/${token}`,
		expiresAt,
		fileName: file.originalName,
		mimeType: file.mimeType,
		size: file.size,
	};
}

export async function resolveDownload(token: string) {
	const parsed = verifyCapabilityToken(token, "dl", env.AUTH_SECRET);
	if (!parsed.ok) {
		throw parsed.error === "expired"
			? new Response("This download link has expired", { status: 410 })
			: new Response("This download link is not valid", { status: 403 });
	}
	return currentVersionFile(parsed.submissionId);
}
