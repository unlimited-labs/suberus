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
			newCssKey: string | null;
	  }
	| { status: "format-changed" }
	| { status: "unavailable" };

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
		newCssKey: keys.newCssKey,
	};
}

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

export type VersionRedlineResult =
	| {
			status: "ready";
			html: string;
			/** Per-style CSS (Word-faithful rendering); "" when the doc has no custom
			 * styles. Trusted-by-construction — injected into the iframe's <style>. */
			css: string;
			insertions: number;
			deletions: number;
	  }
	| { status: "format-changed" }
	| { status: "unavailable" };

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
	const css = pair.newCssKey
		? (await getFileBuffer(pair.newCssKey)).toString("utf8")
		: "";
	return {
		status: "ready",
		html: await selfContain(redlineHtml),
		css,
		insertions: diff.insertions,
		deletions: diff.deletions,
	};
}
