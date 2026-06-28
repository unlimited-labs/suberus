import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { open, seal } from "./secret-box";

const key = createHash("sha256").update("test-secret").digest();

describe("secret-box", () => {
	it("round-trips a secret", () => {
		const sealed = seal(key, "hunter2-p12-password");
		expect(sealed).not.toContain("hunter2");
		expect(open(key, sealed)).toBe("hunter2-p12-password");
	});

	it("fails to open with a different key", () => {
		const sealed = seal(key, "secret");
		const other = createHash("sha256").update("other-secret").digest();
		expect(() => open(other, sealed)).toThrow();
	});

	it("fails to open tampered ciphertext", () => {
		const sealed = seal(key, "secret");
		const buf = Buffer.from(sealed, "base64");
		buf[buf.length - 1] ^= 0xff;
		expect(() => open(key, buf.toString("base64"))).toThrow();
	});
});
