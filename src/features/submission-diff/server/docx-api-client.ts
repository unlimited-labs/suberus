import { env } from "@/env";
import {
	requestOrThrow,
	SIDECAR_TIMEOUT_MS,
	sidecarBase,
	sidecarHealth,
	sidecarNormalize,
} from "./http";

const base = () => sidecarBase(env.DOCX_API_URL, "DOCX_API_URL");

export interface DocxApiHealth {
	pandocVersion: string | null;
	libreofficeVersion: string | null;
	xmldiffVersion: string | null;
	normalizerConfigHash: string;
	schemaVersion: number;
}

/** Toolchain versions for the artifact cache key (cheap, no conversion). */
export function docxApiHealth(): Promise<DocxApiHealth> {
	return sidecarHealth<DocxApiHealth>(base(), "docx-api");
}

/** POST a DOCX to docx-api and return the zip bundle bytes. */
export function normalizeDocx(
	bytes: Buffer,
	fileName: string,
): Promise<Buffer> {
	return sidecarNormalize(
		base(),
		"/v1/normalize",
		"docx-api normalize",
		bytes,
		fileName,
	);
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
		`${base()}/v1/diff`,
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
