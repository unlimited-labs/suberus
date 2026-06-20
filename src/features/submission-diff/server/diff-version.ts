import { ArtifactKind } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { getFileBuffer } from "@/shared/server/storage";
import { persistRedline } from "./cas";
import { diffHtml, redlineStats } from "./diff";

const HTML_SHA_RE = /([0-9a-f]{64})\.html$/;

/** The normalized-HTML sha embedded in a CAS html key. */
function shaFromHtmlKey(key: string): string {
	const match = HTML_SHA_RE.exec(key);
	if (!match) throw new Error(`unexpected normalized-html key: ${key}`);
	return match[1];
}

export interface DiffVersionsInput {
	oldVersionId: string;
	oldHtmlKey: string;
	newVersionId: string;
	newHtmlKey: string;
}

export interface DiffVersionsResult {
	diffArtifactId: string;
	cached: boolean;
	redlineKey: string;
	insertions: number;
	deletions: number;
}

/**
 * ETAP2: build (or reuse) the immutable redline between two normalized
 * artifacts. Content-addressed by the pair of normalized-HTML shas, so the same
 * content pair never re-diffs regardless of which versions requested it.
 */
export async function diffVersionArtifacts(
	input: DiffVersionsInput,
): Promise<DiffVersionsResult> {
	const oldArtifactSha = shaFromHtmlKey(input.oldHtmlKey);
	const newArtifactSha = shaFromHtmlKey(input.newHtmlKey);

	const existing = await prisma.versionDiffArtifact.findUnique({
		where: {
			oldArtifactSha_newArtifactSha: { oldArtifactSha, newArtifactSha },
		},
	});
	if (existing) {
		return {
			diffArtifactId: existing.id,
			cached: true,
			redlineKey: existing.redlineKey,
			insertions: existing.insCount,
			deletions: existing.delCount,
		};
	}

	const [oldBuf, newBuf] = await Promise.all([
		getFileBuffer(input.oldHtmlKey),
		getFileBuffer(input.newHtmlKey),
	]);
	const redline = diffHtml(oldBuf.toString("utf8"), newBuf.toString("utf8"));
	const stats = redlineStats(redline);
	const redlineKey = await persistRedline(redline);

	const created = await prisma.versionDiffArtifact.create({
		data: {
			oldArtifactSha,
			newArtifactSha,
			oldVersionId: input.oldVersionId,
			newVersionId: input.newVersionId,
			redlineKey,
			insCount: stats.insertions,
			delCount: stats.deletions,
		},
	});

	return {
		diffArtifactId: created.id,
		cached: false,
		redlineKey,
		insertions: stats.insertions,
		deletions: stats.deletions,
	};
}

export interface ResolvedHtml {
	htmlKey: string;
	/** Toolchain fingerprint — both sides of a diff MUST share it (gotcha C3). */
	toolchain: string;
}

/**
 * Resolve a version's normalized-HTML artifact (newest toolchain wins).
 *
 * Read-decoupled from the sidecar: the artifact row already carries its own
 * toolchain, so a read NEVER calls `docxApiHealth()`. A down docx-api must not
 * break viewing an already-computed redline (the artifact is immutable). On a
 * toolchain bump the revision-upload flow re-normalizes both sides, so the
 * newest artifact per version is the comparable one.
 */
export async function resolveHtmlKeyForVersion(
	versionId: string,
): Promise<ResolvedHtml | null> {
	const version = await prisma.submissionVersion.findUnique({
		where: { id: versionId },
		select: { file: { select: { sha256: true } } },
	});
	const sourceSha256 = version?.file?.sha256;
	if (!sourceSha256) return null;
	const artifact = await prisma.submissionVersionArtifact.findFirst({
		where: { sourceSha256, kind: ArtifactKind.DOCX },
		orderBy: { createdAt: "desc" },
		select: {
			htmlKey: true,
			pandocVersion: true,
			normalizerConfigHash: true,
			schemaVersion: true,
		},
	});
	if (!artifact) return null;
	return {
		htmlKey: artifact.htmlKey,
		toolchain: `${artifact.pandocVersion}|${artifact.normalizerConfigHash}|${artifact.schemaVersion}`,
	};
}
