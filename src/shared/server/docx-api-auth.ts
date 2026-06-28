import { env } from "@/env";

/**
 * Bearer header for the docx-api sidecar's /v1 endpoints. The sidecar holds the
 * org signing key + P12 password and gen-cert/sign/verify oracles, so it must not
 * be open to anyone who can reach its port. Returns an empty object when no token
 * is configured (local dev / E2E — the sidecar leaves /v1 open in that case).
 */
export function docxApiAuthHeaders(): Record<string, string> {
	return env.DOCX_API_TOKEN
		? { Authorization: `Bearer ${env.DOCX_API_TOKEN}` }
		: {};
}
