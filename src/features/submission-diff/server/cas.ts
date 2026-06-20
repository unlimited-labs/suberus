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
 * Inventory a CAS object so the reaper can see it. Upserted eagerly (right after
 * the S3 put), so even a later failed artifact/diff create leaves a sweepable row
 * instead of an invisible orphan blob — mark-and-sweep, not ref-counting.
 */
async function trackCasObject(key: string, size: number): Promise<void> {
	await prisma.casObject.upsert({
		where: { key },
		create: { key, size },
		update: {},
	});
}

/** Store a rasterized figure in CAS and inventory it for the reaper. */
export async function linkFigure(sha: string, bytes: Buffer): Promise<void> {
	const key = await putIfAbsent(figureKey(sha), bytes, "image/png");
	await trackCasObject(key, bytes.length);
}

/** Persist normalized HTML to CAS (content-addressed by its own sha). Returns the key. */
export async function persistHtml(html: string): Promise<string> {
	const buf = Buffer.from(html, "utf8");
	const key = await putIfAbsent(
		htmlKey(sha256(buf)),
		buf,
		"text/html; charset=utf-8",
	);
	await trackCasObject(key, buf.length);
	return key;
}

/** Persist redline HTML to CAS (content-addressed by its own sha). Returns the key. */
export async function persistRedline(html: string): Promise<string> {
	const buf = Buffer.from(html, "utf8");
	const key = await putIfAbsent(
		redlineKey(sha256(buf)),
		buf,
		"text/html; charset=utf-8",
	);
	await trackCasObject(key, buf.length);
	return key;
}
