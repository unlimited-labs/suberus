import { describe, expect, it } from "vitest";
import { isStaleSessionError } from "./is-stale-session-error";

describe("isStaleSessionError", () => {
	it("matches the SESSION_NOT_FRESH code", () => {
		expect(isStaleSessionError({ code: "SESSION_NOT_FRESH" })).toBe(true);
	});

	it("matches a 403 status", () => {
		expect(isStaleSessionError({ status: 403 })).toBe(true);
	});

	it("ignores other errors", () => {
		expect(isStaleSessionError({ status: 400 })).toBe(false);
		expect(isStaleSessionError({ code: "INVALID_PASSWORD" })).toBe(false);
		expect(isStaleSessionError(null)).toBe(false);
		expect(isStaleSessionError(undefined)).toBe(false);
	});
});
