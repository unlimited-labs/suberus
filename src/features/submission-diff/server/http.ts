export { requestOrThrow, sidecarBase } from "@/shared/server/sidecar-http";

import { requestOrThrow } from "@/shared/server/sidecar-http";

/** Per-operation wall-clock caps; a hung sidecar must not wedge the worker. */
export const SIDECAR_TIMEOUT_MS = {
	normalize: 120_000,
	diff: 30_000,
	health: 5_000,
} as const;

export async function sidecarHealth<T>(base: string, name: string): Promise<T> {
	const res = await requestOrThrow(
		`${base}/`,
		{},
		`${name} health`,
		SIDECAR_TIMEOUT_MS.health,
	);
	// SAFETY: shape is the service's documented response contract; a mismatch surfaces on first field read.
	return (await res.json()) as T;
}

export async function sidecarNormalize(
	base: string,
	endpoint: string,
	errorPrefix: string,
	bytes: Buffer,
	fileName: string,
	headers?: Record<string, string>,
): Promise<Buffer> {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(bytes)]), fileName);
	const res = await requestOrThrow(
		`${base}${endpoint}`,
		{ method: "POST", body: form, headers },
		errorPrefix,
		SIDECAR_TIMEOUT_MS.normalize,
	);
	return Buffer.from(await res.arrayBuffer());
}
