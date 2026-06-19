import { prisma } from "@/shared/server/db.server";
import { enqueueVersionNormalize } from "./enqueue";
import type { NormalizeInput } from "./normalize-version";

export interface RevisionNormalizeInput {
	submissionId: string;
	/** Version number of the just-uploaded revision (always > 1 by caller). */
	currentVersionNumber: number;
	current: NormalizeInput;
}

/** A normalizable predecessor: present, with a DOCX file. */
function isDocxFileName(name: string): boolean {
	return name.toLowerCase().endsWith(".docx");
}

/**
 * On a DOCX revision (v2+) upload, enqueue normalization of the new version AND
 * its immediate predecessor. The lazy redline needs BOTH sides normalized, and a
 * v1 is never normalized on its own — we only normalize once a diff is meaningful.
 * Idempotent: the content-addressed cache short-circuits an already-normalized file.
 */
export async function enqueueRevisionNormalize(
	input: RevisionNormalizeInput,
): Promise<void> {
	await enqueueVersionNormalize(input.current);

	const previous = await prisma.submissionVersion.findFirst({
		where: {
			submissionId: input.submissionId,
			version: { lt: input.currentVersionNumber },
		},
		orderBy: { version: "desc" },
		select: {
			file: { select: { id: true, storageKey: true, fileName: true } },
		},
	});
	const file = previous?.file;
	if (!file || !isDocxFileName(file.fileName)) return;

	await enqueueVersionNormalize({
		storageKey: file.storageKey,
		fileName: file.fileName,
		fileId: file.id,
	});
}
