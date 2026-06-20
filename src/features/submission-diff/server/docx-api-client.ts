import { env } from "@/env";
import { requestOrThrow, SIDECAR_TIMEOUT_MS } from "./http";

function baseUrl(): string {
	if (!env.DOCX_API_URL) {
		throw new Error("DOCX_API_URL is not configured");
	}
	return env.DOCX_API_URL.replace(/\/+$/, "");
}

export interface DocxApiHealth {
	pandocVersion: string | null;
	libreofficeVersion: string | null;
	xmldiffVersion: string | null;
	normalizerConfigHash: string;
	schemaVersion: number;
}

/** Toolchain versions for the artifact cache key (cheap, no conversion). */
export async function docxApiHealth(): Promise<DocxApiHealth> {
	const res = await requestOrThrow(
		`${baseUrl()}/`,
		{},
		"docx-api health",
		SIDECAR_TIMEOUT_MS.health,
	);
	return (await res.json()) as DocxApiHealth;
}

/** POST a DOCX to docx-api and return the zip bundle bytes. */
export async function normalizeDocx(
	bytes: Buffer,
	fileName: string,
): Promise<Buffer> {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(bytes)]), fileName);
	const res = await requestOrThrow(
		`${baseUrl()}/v1/normalize`,
		{ method: "POST", body: form },
		"docx-api normalize",
		SIDECAR_TIMEOUT_MS.normalize,
	);
	return Buffer.from(await res.arrayBuffer());
}

/**
 * Structural redline between two normalized HTML fragments (xmldiff in the
 * sidecar). The result is UNTRUSTED HTML — the caller MUST DOMPurify-sanitize it
 * before persisting/rendering.
 */
export async function diffHtmlPair(
	htmlA: string,
	htmlB: string,
): Promise<string> {
	const res = await requestOrThrow(
		`${baseUrl()}/v1/diff`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ htmlA, htmlB }),
		},
		"docx-api diff",
		SIDECAR_TIMEOUT_MS.diff,
	);
	const data = (await res.json()) as { redline: string };
	return data.redline;
}
