import { prisma } from "@/shared/server/db.server";
import { fileExists, uploadFile } from "@/shared/server/storage";
import { sha256 } from "./normalize";

const PREFIX = "version-diff";

export function figureKey(sha: string): string {
	return `${PREFIX}/figures/${sha}.png`;
}

export function htmlKey(sha: string): string {
	return `${PREFIX}/html/${sha}.html`;
}

export function redlineKey(sha: string): string {
	return `${PREFIX}/redline/${sha}.html`;
}

export function cssKey(sha: string): string {
	return `${PREFIX}/css/${sha}.css`;
}

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

export async function linkFigure(sha: string, bytes: Buffer): Promise<void> {
	const key = await putIfAbsent(figureKey(sha), bytes, "image/png");
	await trackCasObject(key, bytes.length);
}

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

export async function persistCss(css: string): Promise<string | null> {
	if (!css.trim()) return null;
	const buf = Buffer.from(css, "utf8");
	const key = await putIfAbsent(
		cssKey(sha256(buf)),
		buf,
		"text/css; charset=utf-8",
	);
	await trackCasObject(key, buf.length);
	return key;
}

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
