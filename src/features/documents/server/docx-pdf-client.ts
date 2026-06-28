import { env } from "@/env";
import { docxApiAuthHeaders } from "@/shared/server/docx-api-auth";

/** Wall-clock cap so a wedged LibreOffice can't hang the generate worker forever
 * (the sidecar's own SOFFICE_TIMEOUT_S is 90s; give the HTTP call some headroom). */
const RENDER_PDF_TIMEOUT_MS = 120_000;

function base(): string {
	if (!env.DOCX_API_URL) throw new Error("DOCX_API_URL is not configured");
	return env.DOCX_API_URL.replace(/\/+$/, "");
}

/** POST a filled DOCX to the docx-api sidecar; returns the rendered PDF bytes. */
export async function renderDocxToPdf(
	docx: Buffer,
	fileName: string,
): Promise<Buffer> {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(docx)]), fileName);

	let res: Response;
	try {
		res = await fetch(`${base()}/v1/render-pdf`, {
			method: "POST",
			body: form,
			headers: docxApiAuthHeaders(),
			signal: AbortSignal.timeout(RENDER_PDF_TIMEOUT_MS),
		});
	} catch (e) {
		if (e instanceof Error && e.name === "TimeoutError") {
			throw new Error(
				`docx-api render-pdf timed out after ${RENDER_PDF_TIMEOUT_MS}ms`,
			);
		}
		throw e;
	}
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`docx-api render-pdf failed: ${res.status} ${detail.slice(0, 200)}`.trim(),
		);
	}
	return Buffer.from(await res.arrayBuffer());
}
