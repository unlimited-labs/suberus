import { describe, expect, it } from "vitest";
import { PROGRAM_THEMES, resolveProgramTheme } from "./registry";

describe("resolveProgramTheme", () => {
	it("resolves a known theme id to its meta", () => {
		expect(resolveProgramTheme("editorial")).toBe(PROGRAM_THEMES.editorial);
		expect(resolveProgramTheme("academic")).toBe(PROGRAM_THEMES.academic);
	});

	it("falls back to default for unknown ids", () => {
		expect(resolveProgramTheme("does-not-exist")).toBe(PROGRAM_THEMES.default);
		expect(resolveProgramTheme("")).toBe(PROGRAM_THEMES.default);
	});

	it("marks default as branding-aware and the fixed-palette themes as independent", () => {
		expect(PROGRAM_THEMES.default.brandingAware).toBe(true);
		expect(PROGRAM_THEMES.editorial.brandingAware).toBe(false);
		expect(PROGRAM_THEMES.crimson.brandingAware).toBe(false);
		expect(PROGRAM_THEMES.academic.brandingAware).toBe(false);
	});

	it("maps each theme to a chrome + layout slot", () => {
		expect(PROGRAM_THEMES.default.chrome).toBe("minimal");
		expect(PROGRAM_THEMES.default.layout).toBe("list");
		expect(PROGRAM_THEMES.editorial.chrome).toBe("framed");
		expect(PROGRAM_THEMES.editorial.layout).toBe("list");
		expect(PROGRAM_THEMES.crimson.chrome).toBe("minimal");
		expect(PROGRAM_THEMES.crimson.layout).toBe("list");
		expect(PROGRAM_THEMES.academic.chrome).toBe("framed");
		expect(PROGRAM_THEMES.academic.layout).toBe("grid");
	});
});
