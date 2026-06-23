/**
 * Shared sidecar fetch: bounded by an AbortSignal timeout and a uniform
 * ok-check. A hung sidecar (e.g. pdf-api inference on a pathological PDF) would
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

/** Resolve a sidecar base URL from its configured value, stripping trailing slashes. */
export function sidecarBase(url: string | undefined, envName: string): string {
	if (!url) throw new Error(`${envName} is not configured`);
	return url.replace(/\/+$/, "");
}

/** GET the sidecar's `/` health doc (cheap, no conversion). */
export async function sidecarHealth<T>(base: string, name: string): Promise<T> {
	const res = await requestOrThrow(
		`${base}/`,
		{},
		`${name} health`,
		SIDECAR_TIMEOUT_MS.health,
	);
	return (await res.json()) as T;
}

/** POST a file to a sidecar endpoint and return the response body bytes. */
export async function sidecarNormalize(
	base: string,
	endpoint: string,
	errorPrefix: string,
	bytes: Buffer,
	fileName: string,
): Promise<Buffer> {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(bytes)]), fileName);
	const res = await requestOrThrow(
		`${base}${endpoint}`,
		{ method: "POST", body: form },
		errorPrefix,
		SIDECAR_TIMEOUT_MS.normalize,
	);
	return Buffer.from(await res.arrayBuffer());
}
