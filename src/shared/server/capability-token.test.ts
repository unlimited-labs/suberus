import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	createCapabilityToken,
	DOWNLOAD_LINK_TTL_MS,
	UPLOAD_LINK_TTL_MS,
	verifyCapabilityToken,
} from "@/shared/server/capability-token";

const SECRET = "test-secret-at-least-32-characters-long";
const subjectId = "11111111-2222-3333-4444-555555555555";

const upload = (ttl = UPLOAD_LINK_TTL_MS) =>
	createCapabilityToken("up", subjectId, SECRET, ttl);

describe("capability token", () => {
	it("round-trips the subject id", () => {
		expect(verifyCapabilityToken(upload().token, "up", SECRET)).toEqual({
			ok: true,
			subjectId,
		});
	});

	it("refuses a token minted for the other purpose", () => {
		const up = upload().token;
		const down = createCapabilityToken(
			"dl",
			subjectId,
			SECRET,
			DOWNLOAD_LINK_TTL_MS,
		).token;

		expect(verifyCapabilityToken(up, "dl", SECRET)).toEqual({
			ok: false,
			error: "purpose",
		});
		expect(verifyCapabilityToken(down, "up", SECRET)).toEqual({
			ok: false,
			error: "purpose",
		});
	});

	it("keeps document uploads apart from submission uploads", () => {
		const document = createCapabilityToken(
			"dup",
			subjectId,
			SECRET,
			UPLOAD_LINK_TTL_MS,
		).token;

		expect(verifyCapabilityToken(document, "up", SECRET)).toEqual({
			ok: false,
			error: "purpose",
		});
		expect(verifyCapabilityToken(upload().token, "dup", SECRET)).toEqual({
			ok: false,
			error: "purpose",
		});
	});

	it("rejects a tampered payload", () => {
		const [encoded, signature] = upload().token.split(".");
		const payload = Buffer.from(encoded, "base64url").toString("utf8");
		const swapped = payload.replace(
			subjectId,
			"99999999-2222-3333-4444-555555555555",
		);
		const forged = `${Buffer.from(swapped).toString("base64url")}.${signature}`;

		expect(verifyCapabilityToken(forged, "up", SECRET)).toEqual({
			ok: false,
			error: "signature",
		});
	});

	it("rejects a token signed with another secret", () => {
		const { token } = createCapabilityToken(
			"up",
			subjectId,
			"a-different-secret-value",
			UPLOAD_LINK_TTL_MS,
		);
		expect(verifyCapabilityToken(token, "up", SECRET)).toEqual({
			ok: false,
			error: "signature",
		});
	});

	it("rejects an expired token", () => {
		expect(verifyCapabilityToken(upload(-1).token, "up", SECRET)).toEqual({
			ok: false,
			error: "expired",
		});
	});

	it("accepts a legacy upload token with no purpose segment", () => {
		const legacyPayload = `${subjectId}.${Date.now() + UPLOAD_LINK_TTL_MS}`;
		const token = `${Buffer.from(legacyPayload).toString("base64url")}.${createHmac(
			"sha256",
			SECRET,
		)
			.update(legacyPayload)
			.digest("base64url")}`;

		expect(verifyCapabilityToken(token, "up", SECRET)).toEqual({
			ok: true,
			subjectId,
		});
		expect(verifyCapabilityToken(token, "dl", SECRET)).toEqual({
			ok: false,
			error: "purpose",
		});
	});

	it("rejects garbage", () => {
		expect(verifyCapabilityToken("nonsense", "up", SECRET).ok).toBe(false);
		expect(verifyCapabilityToken("", "up", SECRET).ok).toBe(false);
	});
});
