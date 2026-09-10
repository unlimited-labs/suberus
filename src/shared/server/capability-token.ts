import { createHmac, timingSafeEqual } from "node:crypto";

export const UPLOAD_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const DOWNLOAD_LINK_TTL_MS = 15 * 60 * 1000;

export type CapabilityPurpose = "up" | "dl" | "dup";

export type CapabilityTokenError =
	| "malformed"
	| "signature"
	| "expired"
	| "purpose";

function sign(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** The subject must be base64url so it never collides with the `.` separator. */
export function createCapabilityToken(
	purpose: CapabilityPurpose,
	subjectId: string,
	secret: string,
	ttlMs: number,
) {
	const expiresAt = new Date(Date.now() + ttlMs);
	const payload = `${purpose}.${subjectId}.${expiresAt.getTime()}`;
	const encoded = Buffer.from(payload).toString("base64url");
	return { token: `${encoded}.${sign(payload, secret)}`, expiresAt };
}

export function verifyCapabilityToken(
	token: string,
	purpose: CapabilityPurpose,
	secret: string,
):
	| { ok: true; subjectId: string }
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

	const parts = payload.split(".");
	// Upload tokens minted before the purpose segment carry `submissionId.expiresAt`.
	// Drop this branch once UPLOAD_LINK_TTL_MS has passed since the deploy.
	const [tokenPurpose, subjectId, expiresAt] =
		parts.length === 2 ? ["up", ...parts] : parts;
	const expiry = Number(expiresAt);
	if (!tokenPurpose || !subjectId || !Number.isFinite(expiry)) {
		return { ok: false, error: "malformed" };
	}
	if (tokenPurpose !== purpose) return { ok: false, error: "purpose" };
	if (Date.now() > expiry) return { ok: false, error: "expired" };

	return { ok: true, subjectId };
}
