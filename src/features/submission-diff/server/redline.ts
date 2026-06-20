import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { getFileBuffer } from "@/shared/server/storage";
import { diffVersionArtifacts, resolveHtmlKeyForVersion } from "./diff-version";
import { inlineFigures } from "./figure-inline";
import {
	chooseOldVersionId,
	classifyResolvedPair,
	type PairKeys,
} from "./redline-resolve";
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

async function classifyPair(
	oldVersionId: string,
	newVersionId: string,
): Promise<PairKeys> {
	const [oldRes, newRes] = await Promise.all([
		resolveHtmlKeyForVersion(oldVersionId),
		resolveHtmlKeyForVersion(newVersionId),
	]);
	return classifyResolvedPair(oldRes, newRes);
}

type ResolvedPair =
	| {
			status: "ready";
			oldVersionId: string;
			oldHtmlKey: string;
			newHtmlKey: string;
	  }
	| { status: "format-changed" }
	| { status: "unavailable" };

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
): Promise<ResolvedPair> {
	// IDOR guard lives in chooseOldVersionId: a caller-supplied oldVersionId is
	// honoured only when it belongs to THIS submission, else a reviewer could diff
	// against an unrelated submission's content. The implicit previous version is
	// already submission-scoped.
	const oldVersionId = chooseOldVersionId({
		explicitOldVersionId,
		explicitBelongsToSubmission: explicitOldVersionId
			? await versionInSubmission(explicitOldVersionId, submissionId)
			: false,
		implicitPreviousId: explicitOldVersionId
			? null
			: await previousVersionId(submissionId, currentVersion),
	});
	if (!oldVersionId) return { status: "unavailable" };
	const keys = await classifyPair(oldVersionId, newVersionId);
	if (keys.status !== "ready") return keys;
	return {
		status: "ready",
		oldVersionId,
		oldHtmlKey: keys.oldHtmlKey,
		newHtmlKey: keys.newHtmlKey,
	};
}

/** Authorize the caller for the new version, then resolve the normalized pair. */
async function authorizeAndResolvePair(
	input: { newVersionId: string; oldVersionId?: string },
	userId: string,
	role: UserRole,
): Promise<ResolvedPair> {
	const newVersion = await prisma.submissionVersion.findUnique({
		where: { id: input.newVersionId },
		select: { submissionId: true, version: true },
	});
	if (!newVersion) return { status: "unavailable" };
	if (!(await canSeeSubmission(newVersion.submissionId, userId, role))) {
		return { status: "unavailable" };
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

/**
 * The Compare surface's redline outcome:
 *  - `ready`: a structural redline is available.
 *  - `format-changed`: both versions are normalized but in different formats
 *    (DOCX -> PDF) — no structural redline across extractors; the UI shows a
 *    notice and the text diff still reflects content changes.
 *  - `unavailable`: access denied, no previous version, or a side isn't
 *    normalized yet (transient — normalization is async).
 */
export type VersionRedlineResult =
	| { status: "ready"; html: string; insertions: number; deletions: number }
	| { status: "format-changed" }
	| { status: "unavailable" };

/**
 * Redline HTML for a version pair (defaults to the previous version), for the
 * Compare surface. Figures are inlined as `data:` URIs so the redline iframe is
 * fully self-contained. A format change between versions is reported explicitly
 * (not as `unavailable`) so the UI can distinguish it from "not processed yet".
 */
export async function getVersionRedline(
	input: { newVersionId: string; oldVersionId?: string },
	userId: string,
	role: UserRole,
): Promise<VersionRedlineResult> {
	const pair = await authorizeAndResolvePair(input, userId, role);
	if (pair.status !== "ready") return pair;

	const diff = await diffVersionArtifacts({
		oldVersionId: pair.oldVersionId,
		oldHtmlKey: pair.oldHtmlKey,
		newVersionId: input.newVersionId,
		newHtmlKey: pair.newHtmlKey,
	});
	const redlineHtml = (await getFileBuffer(diff.redlineKey)).toString("utf8");
	return {
		status: "ready",
		html: await selfContain(redlineHtml),
		insertions: diff.insertions,
		deletions: diff.deletions,
	};
}
