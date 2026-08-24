import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	createCapabilityToken,
	DOWNLOAD_LINK_TTL_MS,
	UPLOAD_LINK_TTL_MS,
	verifyCapabilityToken,
} from "@/features/submissions/server/capability-token";

const SECRET = "test-secret-at-least-32-characters-long";
const submissionId = "11111111-2222-3333-4444-555555555555";

const upload = (ttl = UPLOAD_LINK_TTL_MS) =>
	createCapabilityToken("up", submissionId, SECRET, ttl);

describe("capability token", () => {
	it("round-trips the submission id", () => {
		expect(verifyCapabilityToken(upload().token, "up", SECRET)).toEqual({
			ok: true,
			submissionId,
		});
	});

	// The whole point of the purpose segment: an upload link must never become a
	// way to read the file, nor a download link a way to replace it.
	it("refuses a token minted for the other purpose", () => {
		const up = upload().token;
		const down = createCapabilityToken(
			"dl",
			submissionId,
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

	// The submission id is visible in the URL, so re-pointing the link at
	// somebody else's submission has to fail.
	it("rejects a tampered payload", () => {
		const [encoded, signature] = upload().token.split(".");
		const payload = Buffer.from(encoded, "base64url").toString("utf8");
		const swapped = payload.replace(
			submissionId,
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
			submissionId,
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
		const legacyPayload = `${submissionId}.${Date.now() + UPLOAD_LINK_TTL_MS}`;
		const token = `${Buffer.from(legacyPayload).toString("base64url")}.${createHmac(
			"sha256",
			SECRET,
		)
			.update(legacyPayload)
			.digest("base64url")}`;

		expect(verifyCapabilityToken(token, "up", SECRET)).toEqual({
			ok: true,
			submissionId,
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
