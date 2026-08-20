/**
 * Optional PDF API client (docling-powered service).
 * Converts PDF and DOCX to markdown with better formatting than raw XML parsing.
 * Used as enhanced input for LLM extraction when PDF_API_URL is configured.
 * PDF extraction depends on it entirely; for DOCX it is an optional enhancement.
 *
 * Fail-fast: if the service is unavailable, logs error and returns null immediately.
 * DOCX callers then fall back to XML header text (parseDocx zones); PDF has no
 * fallback and the extraction job fails. No retries, no blocking.
 */
import { env } from "@/env";
import { createHealthCache } from "@/shared/server/health-cache";

export interface PdfApiHealthResult {
	status: "healthy" | "unavailable";
	message: string;
}

const healthCache = createHealthCache<boolean>(60_000);

/** Base URL without trailing slash. Health probes hit the root; functional
 * endpoints are versioned under `/v1` (see services/pdf-api). */
function baseUrl(): string {
	return (env.PDF_API_URL ?? "").replace(/\/+$/, "");
}

async function isPdfApiHealthy(): Promise<boolean> {
	if (!env.PDF_API_URL) return false;

	const cached = healthCache.get();
	if (cached !== null) return cached;

	try {
		const response = await fetch(env.PDF_API_URL, {
			signal: AbortSignal.timeout(2_000),
		});
		const healthy = response.ok;
		healthCache.set(healthy);
		if (!healthy)
			console.warn("[pdf-api] Service unhealthy at", env.PDF_API_URL);
		return healthy;
	} catch {
		healthCache.set(false);
		console.warn("[pdf-api] Service unavailable at", env.PDF_API_URL);
		return false;
	}
}

export async function checkPdfApiHealth(): Promise<PdfApiHealthResult> {
	if (!env.PDF_API_URL) {
		return { status: "unavailable", message: "PDF_API_URL not configured" };
	}

	try {
		const response = await fetch(env.PDF_API_URL, {
			signal: AbortSignal.timeout(2_000),
		});

		if (!response.ok) {
			return {
				status: "unavailable",
				message: `PDF API returned ${response.status}`,
			};
		}
		return { status: "healthy", message: "Connected" };
	} catch {
		return {
			status: "unavailable",
			message: "Cannot reach PDF API service",
		};
	}
}

export async function getPdfApiMarkdown(
	buffer: Buffer,
	fileName: string,
): Promise<string | null> {
	if (!env.PDF_API_URL) return null;
	if (!(await isPdfApiHealthy())) return null;

	try {
		const form = new FormData();
		form.append("file", new Blob([new Uint8Array(buffer)]), fileName);

		const response = await fetch(`${baseUrl()}/v1/markdown`, {
			method: "POST",
			body: form,
			signal: AbortSignal.timeout(120_000),
		});

		if (!response.ok) {
			console.error(`[pdf-api] Conversion failed: ${response.status}`);
			return null;
		}

		// SAFETY: shape is the service's documented response contract; a mismatch surfaces on first field read.
		const data = (await response.json()) as { markdown?: string };
		return data.markdown ?? null;
	} catch (error) {
		healthCache.set(false);
		console.error("[pdf-api] Request failed, disabling for 60s:", error);
		return null;
	}
}
