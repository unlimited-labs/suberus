import { prisma } from "@/shared/server/db.server";
import { fileExists, uploadFile } from "@/shared/server/storage";
import { sha256 } from "./normalize";

// Top-level bucket prefix for all version-diff artifacts, so content-addressed
// figures/HTML never mix with `submissions/`, `reviews/`, `extraction-staging/`.
const PREFIX = "version-diff";

/** CAS key for a rasterized figure (content-addressed by its sha). */
export function figureKey(sha: string): string {
	return `${PREFIX}/figures/${sha}.png`;
}

/** CAS key for a normalized HTML blob (content-addressed by its sha). */
export function htmlKey(sha: string): string {
	return `${PREFIX}/html/${sha}.html`;
}

/** CAS key for a redline (diff) HTML blob (content-addressed by its sha). */
export function redlineKey(sha: string): string {
	return `${PREFIX}/redline/${sha}.html`;
}

/** Upload bytes to `key` only if absent — content-addressed, so writes are idempotent. */
async function putIfAbsent(
	key: string,
	bytes: Buffer,
	mimeType: string,
): Promise<string> {
	if (!(await fileExists(key))) {
		await uploadFile(bytes, key, mimeType);
	}
	return key;
}

/**
 * Store a rasterized figure in CAS and ref-count its Blob. Called once per unique
 * figure sha when a NEW artifact is created, so refCount = number of artifacts
 * referencing the figure (safe shared-figure deletion in a later phase).
 */
export async function linkFigure(sha: string, bytes: Buffer): Promise<void> {
	await putIfAbsent(figureKey(sha), bytes, "image/png");
	await prisma.blob.upsert({
		where: { sha256: sha },
		create: { sha256: sha, size: bytes.length, refCount: 1 },
		update: { refCount: { increment: 1 } },
	});
}

/** Persist normalized HTML to CAS (content-addressed by its own sha). Returns the key. */
export async function persistHtml(html: string): Promise<string> {
	const buf = Buffer.from(html, "utf8");
	return putIfAbsent(htmlKey(sha256(buf)), buf, "text/html; charset=utf-8");
}

/** Persist redline HTML to CAS (content-addressed by its own sha). Returns the key. */
export async function persistRedline(html: string): Promise<string> {
	const buf = Buffer.from(html, "utf8");
	return putIfAbsent(redlineKey(sha256(buf)), buf, "text/html; charset=utf-8");
}
