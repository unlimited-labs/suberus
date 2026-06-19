import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { getFileBuffer } from "@/shared/server/storage";
import { diffVersionArtifacts, resolveHtmlKeyForVersion } from "./diff-version";
import { inlineFigures } from "./figure-inline";
import { renderMathInHtml } from "./render-math";

const PRIVILEGED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.EDITOR];

/** Admin/editor, the author, or an assigned reviewer may see a submission's redline. */
async function canSeeSubmission(
	submissionId: string,
	userId: string,
	role: UserRole,
): Promise<boolean> {
	if (PRIVILEGED_ROLES.includes(role)) return true;
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: { userId: true },
	});
	if (submission?.userId === userId) return true;
	const assignment = await prisma.reviewAssignment.findFirst({
		where: { submissionId, reviewerId: userId },
		select: { id: true },
	});
	return assignment !== null;
}

/** Id of the version immediately preceding `before` in a submission, if any. */
async function previousVersionId(
	submissionId: string,
	before: number,
): Promise<string | null> {
	const previous = await prisma.submissionVersion.findFirst({
		where: { submissionId, version: { lt: before } },
		orderBy: { version: "desc" },
		select: { id: true },
	});
	return previous?.id ?? null;
}

/** Both versions' normalized-HTML keys, or null if either isn't normalized. */
async function bothHtmlKeys(
	oldVersionId: string,
	newVersionId: string,
): Promise<{ oldHtmlKey: string; newHtmlKey: string } | null> {
	const [oldHtmlKey, newHtmlKey] = await Promise.all([
		resolveHtmlKeyForVersion(oldVersionId),
		resolveHtmlKeyForVersion(newVersionId),
	]);
	if (!oldHtmlKey || !newHtmlKey) return null;
	return { oldHtmlKey, newHtmlKey };
}

interface ResolvedPair {
	oldVersionId: string;
	oldHtmlKey: string;
	newHtmlKey: string;
}

async function resolvePair(
	submissionId: string,
	currentVersion: number,
	newVersionId: string,
	explicitOldVersionId?: string,
): Promise<ResolvedPair | null> {
	const oldVersionId =
		explicitOldVersionId ??
		(await previousVersionId(submissionId, currentVersion));
	if (!oldVersionId) return null;
	const keys = await bothHtmlKeys(oldVersionId, newVersionId);
	if (!keys) return null;
	return { oldVersionId, ...keys };
}

export interface VersionRedline {
	html: string;
	insertions: number;
	deletions: number;
}

/**
 * Redline HTML for a version pair (defaults to the previous version), for the
 * Compare surface. Returns null when access is denied, there is no previous
 * version, or either side isn't normalized yet. Figures are inlined as `data:`
 * URIs so the redline iframe is fully self-contained.
 */
export async function getVersionRedline(
	input: { newVersionId: string; oldVersionId?: string },
	userId: string,
	role: UserRole,
): Promise<VersionRedline | null> {
	const newVersion = await prisma.submissionVersion.findUnique({
		where: { id: input.newVersionId },
		select: { submissionId: true, version: true },
	});
	if (!newVersion) return null;
	if (!(await canSeeSubmission(newVersion.submissionId, userId, role))) {
		return null;
	}

	const pair = await resolvePair(
		newVersion.submissionId,
		newVersion.version,
		input.newVersionId,
		input.oldVersionId,
	);
	if (!pair) return null;

	const diff = await diffVersionArtifacts({
		oldVersionId: pair.oldVersionId,
		oldHtmlKey: pair.oldHtmlKey,
		newVersionId: input.newVersionId,
		newHtmlKey: pair.newHtmlKey,
	});
	const redlineHtml = (await getFileBuffer(diff.redlineKey)).toString("utf8");
	return {
		html: renderMathInHtml(await inlineFigures(redlineHtml)),
		insertions: diff.insertions,
		deletions: diff.deletions,
	};
}
