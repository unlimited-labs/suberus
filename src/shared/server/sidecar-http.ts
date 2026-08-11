import { logger } from "@/logger";

/**
 * Shared sidecar fetch: bounded by an AbortSignal timeout and a uniform
 * ok-check. A hung sidecar (e.g. pdf-api inference on a pathological PDF) would
 * otherwise wedge the calling worker forever; the timeout frees it so pg-boss
 * can expire + retry the job.
 */
export async function requestOrThrow(
	url: string,
	init: RequestInit,
	errorPrefix: string,
	timeoutMs: number,
): Promise<Response> {
	let res: Response;
	try {
		res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
	} catch (e) {
		if (e instanceof Error && e.name === "TimeoutError") {
			throw new Error(`${errorPrefix} timed out after ${timeoutMs}ms`);
		}
		throw e;
	}
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		// Upstream bodies carry pandoc/LibreOffice stderr and container paths —
		// log them, never put them in a message that can reach a browser.
		logger.error(`${errorPrefix} failed: ${res.status}`, detail.slice(0, 2000));
		throw new Error(`${errorPrefix} failed (${res.status})`);
	}
	return res;
}

/** Resolve a sidecar base URL from its configured value, stripping trailing slashes. */
export function sidecarBase(url: string | undefined, envName: string): string {
	if (!url) throw new Error(`${envName} is not configured`);
	return url.replace(/\/+$/, "");
}
