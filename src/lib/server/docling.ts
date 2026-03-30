/**
 * Optional Docling API client.
 * Converts DOCX to markdown with better formatting than raw XML parsing.
 * Used as enhanced input for LLM extraction when DOCLING_URL is configured.
 *
 * Fail-fast: if docling is unavailable, logs error and returns null immediately.
 * Caller falls back to XML header text — no retries, no blocking.
 */
import { env } from "@/env";
import { createHealthCache } from "./health-cache";

const healthCache = createHealthCache<boolean>(60_000);

async function isDoclingHealthy(): Promise<boolean> {
	if (!env.DOCLING_URL) return false;

	const cached = healthCache.get();
	if (cached !== null) return cached;

	try {
		const response = await fetch(env.DOCLING_URL, {
			signal: AbortSignal.timeout(2_000),
		});
		const healthy = response.ok;
		healthCache.set(healthy);
		if (!healthy)
			console.warn("[docling] Service unhealthy at", env.DOCLING_URL);
		return healthy;
	} catch {
		healthCache.set(false);
		console.warn("[docling] Service unavailable at", env.DOCLING_URL);
		return false;
	}
}

export async function getDoclingMarkdown(
	buffer: Buffer,
	fileName: string,
): Promise<string | null> {
	if (!env.DOCLING_URL) return null;
	if (!(await isDoclingHealthy())) return null;

	try {
		const form = new FormData();
		form.append("file", new Blob([new Uint8Array(buffer)]), fileName);

		const response = await fetch(env.DOCLING_URL, {
			method: "POST",
			body: form,
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) {
			console.error(`[docling] Conversion failed: ${response.status}`);
			return null;
		}

		const data = (await response.json()) as { markdown?: string };
		return data.markdown ?? null;
	} catch (error) {
		healthCache.set(false);
		console.error("[docling] Request failed, disabling for 60s:", error);
		return null;
	}
}
