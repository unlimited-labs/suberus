import { createHmac, timingSafeEqual } from "node:crypto";

export const UPLOAD_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const DOWNLOAD_LINK_TTL_MS = 15 * 60 * 1000;

/** `up` attaches a file, `dl` reads one. Never interchangeable. */
export type CapabilityPurpose = "up" | "dl";

export type CapabilityTokenError =
	| "malformed"
	| "signature"
	| "expired"
	| "purpose";

function sign(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Capability token, like a password-reset link: it carries its own authority, so
 * the holder acts without signing in. Scoped to one submission and to one
 * purpose — an upload link grants no reads and a download link grants no writes.
 * An upload lands on whatever version is current: a draft has exactly one.
 *
 * ponytail: valid until it expires, and a re-upload replaces the file, because
 * single-use needs stored state. Add a consumedAt column if a leaked link ever
 * matters more than letting someone fix a wrong upload.
 *
 * The secret is a parameter, not an env import: this module is unit-tested and
 * loading @/env would fail outside a configured runtime.
 */
export function createCapabilityToken(
	purpose: CapabilityPurpose,
	submissionId: string,
	secret: string,
	ttlMs: number,
) {
	const expiresAt = new Date(Date.now() + ttlMs);
	const payload = `${purpose}.${submissionId}.${expiresAt.getTime()}`;
	const encoded = Buffer.from(payload).toString("base64url");
	return { token: `${encoded}.${sign(payload, secret)}`, expiresAt };
}

export function verifyCapabilityToken(
	token: string,
	purpose: CapabilityPurpose,
	secret: string,
):
	| { ok: true; submissionId: string }
	| { ok: false; error: CapabilityTokenError } {
	const [encoded, signature] = token.split(".");
	if (!encoded || !signature) return { ok: false, error: "malformed" };

	const payload = Buffer.from(encoded, "base64url").toString("utf8");
	const expected = Buffer.from(sign(payload, secret));
	const received = Buffer.from(signature);
	if (
		expected.length !== received.length ||
		!timingSafeEqual(expected, received)
	) {
		return { ok: false, error: "signature" };
	}

	const [tokenPurpose, submissionId, expiresAt] = payload.split(".");
	const expiry = Number(expiresAt);
	if (!tokenPurpose || !submissionId || !Number.isFinite(expiry)) {
		return { ok: false, error: "malformed" };
	}
	if (tokenPurpose !== purpose) return { ok: false, error: "purpose" };
	if (Date.now() > expiry) return { ok: false, error: "expired" };

	return { ok: true, submissionId };
}
