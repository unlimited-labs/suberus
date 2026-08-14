import { describe, expect, it } from "vitest";
import { logLevel } from "./log-level";

describe("LOG_LEVEL", () => {
	it("accepts consola level names, case-insensitively", () => {
		expect(logLevel.parse("Warn")).toBe(1);
		expect(logLevel.parse("debug")).toBe(4);
		expect(logLevel.parse(" SILENT ")).toBe(-999);
	});

	it("still accepts numbers", () => {
		expect(logLevel.parse("0")).toBe(0);
		expect(logLevel.parse("5")).toBe(5);
	});

	it("treats unset and empty alike as info", () => {
		expect(logLevel.parse(undefined)).toBe(3);
		expect(logLevel.parse("")).toBe(3);
	});

	// A typo must fail loudly at boot rather than coerce to NaN and take the
	// process down with an unrelated-looking error.
	it("rejects anything else", () => {
		expect(() => logLevel.parse("wrn")).toThrow();
		expect(() => logLevel.parse("Warn2")).toThrow();
	});
});
