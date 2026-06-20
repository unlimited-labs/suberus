import { prisma } from "@/shared/server/db.server";
import { enqueueVersionNormalize } from "./enqueue";
import { fileKind } from "./file-kind";
import type { NormalizeInput } from "./normalize-version";

export interface RevisionNormalizeInput {
	submissionId: string;
	/** Version number of the just-uploaded revision (always > 1 by caller). */
	currentVersionNumber: number;
	current: NormalizeInput;
}

/**
 * On a diffable revision (v2+) upload, enqueue normalization of the new version
 * AND its immediate predecessor. The lazy redline needs BOTH sides normalized,
 * and a v1 is never normalized on its own — we only normalize once a diff is
 * meaningful. Each side is normalized in its own format (the predecessor may be a
 * different diffable format than the current revision); a cross-format pair simply
 * yields no structural redline downstream. Idempotent: the content-addressed cache
 * short-circuits an already-normalized file.
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
	if (!file || !fileKind(file.fileName)) return;

	await enqueueVersionNormalize({
		storageKey: file.storageKey,
		fileName: file.fileName,
		fileId: file.id,
	});
}
