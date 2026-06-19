import { env } from "@/env";

function baseUrl(): string {
	if (!env.DOCX_API_URL) {
		throw new Error("DOCX_API_URL is not configured");
	}
	return env.DOCX_API_URL.replace(/\/+$/, "");
}

export interface DocxApiHealth {
	pandocVersion: string | null;
	libreofficeVersion: string | null;
	normalizerConfigHash: string;
	schemaVersion: number;
}

/** Toolchain versions for the artifact cache key (cheap, no conversion). */
export async function docxApiHealth(): Promise<DocxApiHealth> {
	const res = await fetch(`${baseUrl()}/`);
	if (!res.ok) {
		throw new Error(`docx-api health failed: ${res.status}`);
	}
	return (await res.json()) as DocxApiHealth;
}

/** POST a DOCX to docx-api and return the zip bundle bytes. */
export async function normalizeDocx(
	bytes: Buffer,
	fileName: string,
): Promise<Buffer> {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(bytes)]), fileName);
	const res = await fetch(`${baseUrl()}/normalize`, {
		method: "POST",
		body: form,
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`docx-api normalize failed: ${res.status} ${detail.slice(0, 200)}`,
		);
	}
	return Buffer.from(await res.arrayBuffer());
}
