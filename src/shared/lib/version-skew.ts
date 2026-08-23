import { queryOptions } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { z } from "zod";

export const versionResponseSchema = z.object({
	commit: z.string(),
	builtAt: z.string(),
	pollMs: z.number().optional(),
});
export type VersionResponse = z.infer<typeof versionResponseSchema>;

/**
 * Response header the server stamps on server-fn responses with the running
 * build id (`GIT_COMMIT`). The client compares it against the build it loaded
 * with to detect a backend deploy that happened under an open tab.
 */
export const VERSION_HEADER = "x-app-version";

const SERVER_FN_PREFIX = "/_serverFn/";

let loadedVersion: string | null = null;
let skewed = false;
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

export function markSkewed() {
	if (skewed) return;
	skewed = true;
	emit();
}

function isRealVersion(version: string | null | undefined): version is string {
	return !!version && version !== "unknown";
}

/**
 * Feed an observed server build id. The first real value becomes the baseline
 * (the build this tab loaded with); any later, differing value means the
 * backend was redeployed → skew.
 */
export function reportVersion(version: string | null | undefined) {
	if (!isRealVersion(version)) return;
	if (loadedVersion === null) loadedVersion = version;
	else if (version !== loadedVersion) markSkewed();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot() {
	return skewed;
}

export function useVersionSkew() {
	return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

const VERSION_ENDPOINT = "/api/version";

export function installFetchVersionWatch() {
	if (!("window" in globalThis)) return;
	const original = window.fetch;
	if ("__versionWatch" in original) return;

	// Re-check the backend version out-of-band. Used when a server-fn errors
	// without our header: a stale hash from a new deploy and a genuine handler
	// 500 are indistinguishable on the client (prod hides the message), so
	// instead of assuming skew we ask /api/version and let reportVersion decide
	// — skew only if the commit actually changed.
	const recheckVersion = async () => {
		try {
			const res = await original(VERSION_ENDPOINT);
			if (!res.ok) return;
			const parsed = versionResponseSchema.safeParse(await res.json());
			if (parsed.success) reportVersion(parsed.data.commit);
		} catch {}
	};

	// Response.url is the resolved (same-origin) server-fn URL in the browser.
	const inspect = (res: Response) => {
		if (!res.url.includes(SERVER_FN_PREFIX)) return;
		const version = res.headers.get(VERSION_HEADER);
		if (version) reportVersion(version);
		else if (!res.ok) void recheckVersion();
	};

	const wrapped: typeof window.fetch = async (input, init) => {
		const res = await original(input, init);
		try {
			inspect(res);
		} catch {
			// Never let version watching break a real request.
		}
		return res;
	};
	Object.defineProperty(wrapped, "__versionWatch", { value: true });
	window.fetch = wrapped;

	installChunkErrorWatch();
}

const CHUNK_ERROR_RE =
	/ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

/**
 * After a deploy the stale bundle references hashed chunk filenames the new
 * build no longer serves, so route navigation lazy-loads fail. Treat those as
 * skew too (this is the crash observed on prod when clicking into a section).
 */
function installChunkErrorWatch() {
	const isChunkError = (cause: unknown) => {
		const message =
			cause instanceof Error
				? cause.message
				: (z.string().safeParse(cause).data ?? "");
		return CHUNK_ERROR_RE.test(message);
	};

	window.addEventListener("unhandledrejection", (event) => {
		if (isChunkError(event.reason)) markSkewed();
	});
	window.addEventListener("error", (event) => {
		if (isChunkError(event.error ?? event.message)) markSkewed();
	});
}

export const buildVersionQueryOptions = () =>
	queryOptions({
		queryKey: ["build-version"] as const,
		queryFn: async (): Promise<VersionResponse> => {
			const res = await fetch("/api/version");
			if (!res.ok) throw new Error(`/api/version returned ${res.status}`);
			return versionResponseSchema.parse(await res.json());
		},
	});
