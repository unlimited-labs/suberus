import { env } from "@/env";

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
	const res = await fetch(`${baseUrl()}/`);
	if (!res.ok) {
		throw new Error(`docling-api health failed: ${res.status}`);
	}
	return (await res.json()) as DoclingApiHealth;
}

/** POST a PDF to docling-api and return the zip bundle bytes (document.html + figures). */
export async function normalizePdf(
	bytes: Buffer,
	fileName: string,
): Promise<Buffer> {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(bytes)]), fileName);
	const res = await fetch(`${baseUrl()}/v1/bundle`, {
		method: "POST",
		body: form,
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`docling-api bundle failed: ${res.status} ${detail.slice(0, 200)}`,
		);
	}
	return Buffer.from(await res.arrayBuffer());
}
