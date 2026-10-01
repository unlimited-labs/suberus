import { describe, expect, it, vi } from "vitest";
import { createCapabilityToken } from "@/shared/server/capability-token";
import { readDocumentUploadToken } from "./upload-link";

const SECRET = "test-secret-at-least-32-characters-long";
vi.mock("@/env", () => ({
	env: { AUTH_SECRET: "test-secret-at-least-32-characters-long" },
}));

const base = {
	userId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
	title: "Invoice",
	notify: true,
	by: "9b2c1d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d",
};

function tokenFor(meta: object) {
	const subject = Buffer.from(JSON.stringify(meta)).toString("base64url");
	return createCapabilityToken("dup", subject, SECRET, 60_000).token;
}

describe("readDocumentUploadToken", () => {
	it("keeps the signing choice of a pre-signMode link", () => {
		expect(
			readDocumentUploadToken(tokenFor({ ...base, sign: false })).signMode,
		).toBe("NONE");
		expect(
			readDocumentUploadToken(
				tokenFor({ ...base, sign: true, sealVisible: false }),
			).signMode,
		).toBe("INVISIBLE");
		expect(
			readDocumentUploadToken(tokenFor({ ...base, sign: true })).signMode,
		).toBe("VISIBLE");
	});

	it("reads a current link as issued", () => {
		expect(
			readDocumentUploadToken(tokenFor({ ...base, signMode: "INVISIBLE" }))
				.signMode,
		).toBe("INVISIBLE");
	});
});
