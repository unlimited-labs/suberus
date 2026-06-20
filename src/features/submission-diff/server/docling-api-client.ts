import { env } from "@/env";
import { requestOrThrow, SIDECAR_TIMEOUT_MS } from "./http";

function baseUrl(): string {
	if (!env.DOCLING_URL) {
		throw new Error("DOCLING_URL is not configured");
	}
	return env.DOCLING_URL.replace(/\/+$/, "");
}

export interface DoclingApiHealth {
	/** The pandoc that converts docling markdown -> HTML (the artifact-key column). */
	pandocVersion: string | null;
	doclingVersion: string | null;
	normalizerConfigHash: string;
	schemaVersion: number;
}

/** Toolchain versions for the artifact cache key (cheap, no conversion). */
export async function doclingApiHealth(): Promise<DoclingApiHealth> {
	const res = await requestOrThrow(
		`${baseUrl()}/`,
		{},
		"docling-api health",
		SIDECAR_TIMEOUT_MS.health,
	);
	return (await res.json()) as DoclingApiHealth;
}

/** POST a PDF to docling-api and return the zip bundle bytes (document.html + figures). */
export async function normalizePdf(
	bytes: Buffer,
	fileName: string,
): Promise<Buffer> {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(bytes)]), fileName);
	const res = await requestOrThrow(
		`${baseUrl()}/v1/bundle`,
		{ method: "POST", body: form },
		"docling-api bundle",
		SIDECAR_TIMEOUT_MS.normalize,
	);
	return Buffer.from(await res.arrayBuffer());
}
