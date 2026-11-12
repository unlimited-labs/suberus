// fallow-ignore-file security-sink
// Outbound fetch origin is env.DOCX_API_URL (internal sidecar, operator config),
// never request-derived — not an SSRF surface.
import { env } from "@/env";
import type { PrintDocument } from "@/features/planner/print/print-document-schema";
import { docxApiAuthHeaders } from "@/shared/server/docx-api-auth";
import { requestOrThrow, sidecarBase } from "@/shared/server/sidecar-http";

const IDML_TIMEOUT_MS = 60_000;

export const isIdmlAvailable = () => Boolean(env.DOCX_API_URL);

export async function renderIdml(doc: PrintDocument): Promise<Buffer> {
	const base = sidecarBase(env.DOCX_API_URL, "DOCX_API_URL");
	const res = await requestOrThrow(
		`${base}/v1/idml`,
		{
			method: "POST",
			body: JSON.stringify(doc),
			headers: { ...docxApiAuthHeaders(), "Content-Type": "application/json" },
		},
		"docx-api idml",
		IDML_TIMEOUT_MS,
		"interactive",
	);
	return Buffer.from(await res.arrayBuffer());
}
