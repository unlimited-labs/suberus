// fallow-ignore-file security-sink
// Outbound fetch origin is env.DOCX_API_URL (internal sidecar, operator config),
// never request-derived — not an SSRF surface.
import { env } from "@/env";
import { docxApiAuthHeaders } from "@/shared/server/docx-api-auth";
import { requestOrThrow, sidecarBase } from "@/shared/server/sidecar-http";

/** Wall-clock cap so a wedged LibreOffice can't hang the generate worker forever
 * (the sidecar's own SOFFICE_TIMEOUT_S is 90s; give the HTTP call some headroom). */
const RENDER_PDF_TIMEOUT_MS = 120_000;

export async function renderDocxToPdf(
	docx: Buffer,
	fileName: string,
): Promise<Buffer> {
	const base = sidecarBase(env.DOCX_API_URL, "DOCX_API_URL");
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(docx)]), fileName);

	const res = await requestOrThrow(
		`${base}/v1/render-pdf`,
		{ method: "POST", body: form, headers: docxApiAuthHeaders() },
		"docx-api render-pdf",
		RENDER_PDF_TIMEOUT_MS,
	);
	return Buffer.from(await res.arrayBuffer());
}
