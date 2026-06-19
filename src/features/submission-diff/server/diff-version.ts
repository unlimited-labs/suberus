import { ArtifactKind } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { getFileBuffer } from "@/shared/server/storage";
import { persistRedline } from "./cas";
import { diffHtml, diffStats } from "./diff";
import { docxApiHealth } from "./docx-api-client";

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
	const stats = diffStats(redline);
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

/** Resolve a version's current normalized-HTML key, if it has one under the live toolchain. */
export async function resolveHtmlKeyForVersion(
	versionId: string,
): Promise<string | null> {
	const version = await prisma.submissionVersion.findUnique({
		where: { id: versionId },
		select: { file: { select: { sha256: true } } },
	});
	const sourceSha256 = version?.file?.sha256;
	if (!sourceSha256) return null;
	const health = await docxApiHealth();
	if (!health.pandocVersion) return null;
	const artifact = await prisma.submissionVersionArtifact.findUnique({
		where: {
			sourceSha256_kind_pandocVersion_normalizerConfigHash_schemaVersion: {
				sourceSha256,
				kind: ArtifactKind.DOCX,
				pandocVersion: health.pandocVersion,
				normalizerConfigHash: health.normalizerConfigHash,
				schemaVersion: health.schemaVersion,
			},
		},
		select: { htmlKey: true },
	});
	return artifact?.htmlKey ?? null;
}
