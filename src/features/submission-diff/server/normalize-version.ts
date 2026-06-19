import { ArtifactKind } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { getFileBuffer } from "@/shared/server/storage";
import { linkFigure, persistHtml } from "./cas";
import { docxApiHealth, normalizeDocx } from "./docx-api-client";
import { artifactKey, parseBundle, sha256 } from "./normalize";
import { sanitizeDiffHtml } from "./sanitize";

export interface NormalizeInput {
	/** Garage storage key of the source DOCX. */
	storageKey: string;
	fileName: string;
	/** File row id, for lazy sha256 backfill (optional). */
	fileId?: string;
}

export interface NormalizeResult {
	artifactId: string;
	/** true when an existing artifact for this (source + toolchain) was reused. */
	cached: boolean;
	sourceSha256: string;
	htmlKey: string;
	figures: number;
}

/**
 * ETAP1: normalize one submission version's DOCX into an immutable, sanitized
 * HTML artifact with content-addressed figures.
 *
 *   getFileBuffer -> docx-api /normalize -> parse bundle -> CAS figures (+Blob)
 *   -> DOMPurify-on-jsdom -> persist HTML -> SubmissionVersionArtifact
 *
 * Cache: keyed by the full toolchain fingerprint (source sha + pandoc/normalizer/
 * schema). A hit returns the existing artifact without re-normalizing. Immutable-
 * forever: a toolchain bump yields a new key, never a mutated historical artifact.
 */
export async function normalizeSubmissionFile(
	input: NormalizeInput,
): Promise<NormalizeResult> {
	const bytes = await getFileBuffer(input.storageKey);
	const sourceSha256 = sha256(bytes);

	if (input.fileId) {
		await prisma.file
			.update({ where: { id: input.fileId }, data: { sha256: sourceSha256 } })
			.catch(() => {
				// best-effort backfill; never fail normalization on it
			});
	}

	// Cheap cache pre-check using the sidecar's reported toolchain.
	const health = await docxApiHealth();
	if (!health.pandocVersion) {
		throw new Error("docx-api health is missing pandocVersion");
	}
	const existing = await prisma.submissionVersionArtifact.findUnique({
		where: {
			sourceSha256_kind_pandocVersion_normalizerConfigHash_schemaVersion: {
				sourceSha256,
				kind: ArtifactKind.DOCX,
				pandocVersion: health.pandocVersion,
				normalizerConfigHash: health.normalizerConfigHash,
				schemaVersion: health.schemaVersion,
			},
		},
	});
	if (existing) {
		return {
			artifactId: existing.id,
			cached: true,
			sourceSha256,
			htmlKey: existing.htmlKey,
			figures: 0,
		};
	}

	const bundle = parseBundle(await normalizeDocx(bytes, input.fileName));
	const key = artifactKey(sourceSha256, ArtifactKind.DOCX, bundle.meta);
	const trustedHtml = sanitizeDiffHtml(bundle.html);

	for (const [sha, figureBytes] of bundle.figures) {
		await linkFigure(sha, figureBytes);
	}
	const htmlKey = await persistHtml(trustedHtml);

	const created = await prisma.submissionVersionArtifact.create({
		data: { ...key, htmlKey, warnings: bundle.meta.warnings },
	});

	return {
		artifactId: created.id,
		cached: false,
		sourceSha256,
		htmlKey,
		figures: bundle.figures.size,
	};
}
