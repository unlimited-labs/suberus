import { env } from "@/env";
import { createHealthCache } from "@/shared/server/health-cache";
import {
	requestOrThrow,
	SIDECAR_TIMEOUT_MS,
	sidecarBase,
	sidecarHealth,
	sidecarNormalize,
} from "./http";

const base = () => sidecarBase(env.DOCX_API_URL, "DOCX_API_URL");

export interface DocxApiHealthResult {
	status: "healthy" | "unavailable";
	message: string;
}

const healthCache = createHealthCache<DocxApiHealthResult>(60_000);

/** Liveness probe for the scheduled health task (GET root, parses `status`). */
export async function checkDocxApiHealth(): Promise<DocxApiHealthResult> {
	if (!env.DOCX_API_URL) {
		return { status: "unavailable", message: "DOCX_API_URL not configured" };
	}

	const cached = healthCache.get();
	if (cached) return cached;

	let result: DocxApiHealthResult;
	try {
		const response = await fetch(`${base()}/`, {
			signal: AbortSignal.timeout(SIDECAR_TIMEOUT_MS.health),
		});
		if (!response.ok) {
			result = {
				status: "unavailable",
				message: `docx-api returned ${response.status}`,
			};
		} else {
			const data = (await response.json().catch(() => ({}))) as {
				status?: string;
			};
			result =
				data.status === "healthy"
					? { status: "healthy", message: "Connected" }
					: {
							status: "unavailable",
							message: "docx-api did not report healthy status",
						};
		}
	} catch {
		result = { status: "unavailable", message: "Cannot reach docx-api" };
	}

	healthCache.set(result);
	return result;
}

export interface DocxApiHealth {
	pandocVersion: string | null;
	libreofficeVersion: string | null;
	xmldiffVersion: string | null;
	normalizerConfigHash: string;
	schemaVersion: number;
}

/** Toolchain versions for the artifact cache key (cheap, no conversion). */
export function docxApiHealth(): Promise<DocxApiHealth> {
	return sidecarHealth<DocxApiHealth>(base(), "docx-api");
}

/** POST a DOCX to docx-api and return the zip bundle bytes. */
export function normalizeDocx(
	bytes: Buffer,
	fileName: string,
): Promise<Buffer> {
	return sidecarNormalize(
		base(),
		"/v1/normalize",
		"docx-api normalize",
		bytes,
		fileName,
	);
}

/**
 * Structural redline between two normalized HTML fragments (xmldiff in the
 * sidecar). The result is UNTRUSTED HTML — the caller MUST DOMPurify-sanitize it
 * before persisting/rendering.
 */
export async function diffHtmlPair(
	htmlA: string,
	htmlB: string,
): Promise<string> {
	const res = await requestOrThrow(
		`${base()}/v1/diff`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ htmlA, htmlB }),
		},
		"docx-api diff",
		SIDECAR_TIMEOUT_MS.diff,
	);
	const data = (await res.json()) as { redline: string };
	return data.redline;
}
