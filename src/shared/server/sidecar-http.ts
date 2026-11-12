import { env } from "@/env";
import { logger } from "@/logger";

export type SharedServicePriority = "interactive" | "batch";

export class SharedServiceBusyError extends Error {
	constructor() {
		super("The document service is busy, try again in a moment.");
	}
}

export function sharedServiceHeaders(priority: SharedServicePriority) {
	return {
		"X-Suberus-Instance": new URL(env.APP_BASE_URL).host,
		"X-Suberus-Priority": priority,
	};
}

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
	priority: SharedServicePriority,
): Promise<Response> {
	const headers = new Headers(init.headers);
	for (const [k, v] of Object.entries(sharedServiceHeaders(priority))) {
		headers.set(k, v);
	}
	let res: Response;
	try {
		res = await fetch(url, {
			...init,
			headers,
			signal: AbortSignal.timeout(timeoutMs),
		});
	} catch (e) {
		if (e instanceof Error && e.name === "TimeoutError") {
			throw new Error(`${errorPrefix} timed out after ${timeoutMs}ms`);
		}
		throw e;
	}
	if (res.status === 503) {
		logger.warn(
			`${errorPrefix} busy (503), retry-after=${res.headers.get("retry-after")}`,
		);
		throw new SharedServiceBusyError();
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

export function sidecarBase(url: string | undefined, envName: string): string {
	if (!url) throw new Error(`${envName} is not configured`);
	return url.replace(/\/+$/, "");
}
