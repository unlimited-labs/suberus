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

/**
 * Both versions' normalized-HTML keys, or null if either isn't normalized or the
 * two were produced by different toolchains (C3 — never diff across pandoc/
 * normalizer versions, which would surface spurious differences).
 */
async function bothHtmlKeys(
	oldVersionId: string,
	newVersionId: string,
): Promise<{ oldHtmlKey: string; newHtmlKey: string } | null> {
	const [oldRes, newRes] = await Promise.all([
		resolveHtmlKeyForVersion(oldVersionId),
		resolveHtmlKeyForVersion(newVersionId),
	]);
	if (!oldRes || !newRes) return null;
	if (oldRes.toolchain !== newRes.toolchain) return null;
	return { oldHtmlKey: oldRes.htmlKey, newHtmlKey: newRes.htmlKey };
}

interface ResolvedPair {
	oldVersionId: string;
	oldHtmlKey: string;
	newHtmlKey: string;
}

/** Whether `versionId` belongs to `submissionId`. */
async function versionInSubmission(
	versionId: string,
	submissionId: string,
): Promise<boolean> {
	const version = await prisma.submissionVersion.findUnique({
		where: { id: versionId },
		select: { submissionId: true },
	});
	return version?.submissionId === submissionId;
}

async function resolvePair(
	submissionId: string,
	currentVersion: number,
	newVersionId: string,
	explicitOldVersionId?: string,
): Promise<ResolvedPair | null> {
	// IDOR guard: only the new version is authorized by the caller. A caller-
	// supplied oldVersionId must belong to the SAME submission, else a reviewer
	// could diff against an unrelated submission's content. The implicit branch
	// (previousVersionId) is already scoped by submissionId.
	if (
		explicitOldVersionId &&
		!(await versionInSubmission(explicitOldVersionId, submissionId))
	) {
		return null;
	}
	const oldVersionId =
		explicitOldVersionId ??
		(await previousVersionId(submissionId, currentVersion));
	if (!oldVersionId) return null;
	const keys = await bothHtmlKeys(oldVersionId, newVersionId);
	if (!keys) return null;
	return { oldVersionId, ...keys };
}

/** Authorize the caller for the new version, then resolve the normalized pair. */
async function authorizeAndResolvePair(
	input: { newVersionId: string; oldVersionId?: string },
	userId: string,
	role: UserRole,
): Promise<ResolvedPair | null> {
	const newVersion = await prisma.submissionVersion.findUnique({
		where: { id: input.newVersionId },
		select: { submissionId: true, version: true },
	});
	if (!newVersion) return null;
	if (!(await canSeeSubmission(newVersion.submissionId, userId, role))) {
		return null;
	}
	return resolvePair(
		newVersion.submissionId,
		newVersion.version,
		input.newVersionId,
		input.oldVersionId,
	);
}

/**
 * Inline figures + render math so an HTML fragment is a self-contained document.
 *
 * Security note (gotcha C2/#8): the input `html` is already the authoritative-gate
 * output (sanitized at diff time). We do NOT re-sanitize after this step — both
 * additions are trusted-by-construction: `inlineFigures` injects only our own
 * content-addressed PNG bytes as same-document `data:` URIs, and `renderMathInHtml`
 * runs KaTeX with `trust:false` (which neutralizes `\href`/`\htmlData`) and emits
 * MathML the strict diff allowlist would otherwise strip. The hard boundary for this
 * stage is the script-less sandboxed iframe + its `default-src 'none'` CSP, not a
 * second DOMPurify pass.
 */
async function selfContain(html: string): Promise<string> {
	return renderMathInHtml(await inlineFigures(html));
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
	const pair = await authorizeAndResolvePair(input, userId, role);
	if (!pair) return null;

	const diff = await diffVersionArtifacts({
		oldVersionId: pair.oldVersionId,
		oldHtmlKey: pair.oldHtmlKey,
		newVersionId: input.newVersionId,
		newHtmlKey: pair.newHtmlKey,
	});
	const redlineHtml = (await getFileBuffer(diff.redlineKey)).toString("utf8");
	return {
		html: await selfContain(redlineHtml),
		insertions: diff.insertions,
		deletions: diff.deletions,
	};
}
