import { describe, expect, it } from "vitest";
import {
	createUploadToken,
	verifyUploadToken,
} from "@/features/submissions/server/upload-token";

const SECRET = "test-secret-at-least-32-characters-long";
const submissionId = "11111111-2222-3333-4444-555555555555";

describe("upload token", () => {
	it("round-trips the submission id", () => {
		const { token } = createUploadToken(submissionId, SECRET);
		expect(verifyUploadToken(token, SECRET)).toEqual({
			ok: true,
			submissionId,
		});
	});

	// The submission id is visible in the URL, so re-pointing the link at
	// somebody else's submission has to fail.
	it("rejects a tampered payload", () => {
		const { token } = createUploadToken(submissionId, SECRET);
		const [encoded, signature] = token.split(".");
		const payload = Buffer.from(encoded, "base64url").toString("utf8");
		const swapped = payload.replace(
			submissionId,
			"99999999-2222-3333-4444-555555555555",
		);
		const forged = `${Buffer.from(swapped).toString("base64url")}.${signature}`;

		expect(verifyUploadToken(forged, SECRET)).toEqual({
			ok: false,
			error: "signature",
		});
	});

	it("rejects a token signed with another secret", () => {
		const { token } = createUploadToken(
			submissionId,
			"a-different-secret-value",
		);
		expect(verifyUploadToken(token, SECRET)).toEqual({
			ok: false,
			error: "signature",
		});
	});

	it("rejects an expired token", () => {
		const { token } = createUploadToken(submissionId, SECRET, -1);
		expect(verifyUploadToken(token, SECRET)).toEqual({
			ok: false,
			error: "expired",
		});
	});

	it("rejects garbage", () => {
		expect(verifyUploadToken("nonsense", SECRET).ok).toBe(false);
		expect(verifyUploadToken("", SECRET).ok).toBe(false);
	});
});
