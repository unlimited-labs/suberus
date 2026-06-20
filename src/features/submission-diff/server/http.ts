/**
 * Shared sidecar fetch: bounded by an AbortSignal timeout and a uniform
 * ok-check. A hung sidecar (e.g. docling inference on a pathological PDF) would
 * otherwise wedge the normalize worker forever; the timeout frees it so pg-boss
 * can expire + retry the job.
 */
export const SIDECAR_TIMEOUT_MS = {
	normalize: 120_000,
	diff: 30_000,
	health: 5_000,
} as const;

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
		throw new Error(
			`${errorPrefix} failed: ${res.status} ${detail.slice(0, 200)}`.trim(),
		);
	}
	return res;
}
