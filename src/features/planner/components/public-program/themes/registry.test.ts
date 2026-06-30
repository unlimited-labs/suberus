import { describe, expect, it } from "vitest";
import { AcademicProgram } from "./academic";
import { DefaultProgram } from "./default";
import { EditorialProgram } from "./editorial";
import { PROGRAM_THEMES, resolveProgramTheme } from "./registry";

describe("resolveProgramTheme", () => {
	it("resolves a known theme id to its component", () => {
		expect(resolveProgramTheme("editorial").component).toBe(EditorialProgram);
		expect(resolveProgramTheme("academic").component).toBe(AcademicProgram);
	});

	it("falls back to default for unknown ids", () => {
		expect(resolveProgramTheme("does-not-exist").component).toBe(
			DefaultProgram,
		);
		expect(resolveProgramTheme("").component).toBe(DefaultProgram);
	});

	it("marks default as branding-aware and editorial as independent", () => {
		expect(PROGRAM_THEMES.default.brandingAware).toBe(true);
		expect(PROGRAM_THEMES.editorial.brandingAware).toBe(false);
		expect(PROGRAM_THEMES.academic.brandingAware).toBe(false);
	});
});
