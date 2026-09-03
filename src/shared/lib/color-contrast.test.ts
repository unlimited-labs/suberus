import { describe, expect, it } from "vitest";
import { contrastRatio, ensureContrast } from "./color-contrast";

const LIGHT = "#ffffff";
const DARK = "#262626";

describe("contrastRatio", () => {
	it("is symmetric and matches known WCAG pairs", () => {
		expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
		expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
		expect(contrastRatio("#3b82f6", "#ffffff")).toBeLessThan(4.5);
	});
});

describe("ensureContrast", () => {
	it("leaves a colour that already passes untouched", () => {
		expect(ensureContrast("#f59e0b", DARK)).toBe("#f59e0b");
	});

	it("reaches AA against both surfaces", () => {
		for (const hex of [
			"#3b82f6",
			"#f59e0b",
			"#22c55e",
			"#ec4899",
			"#8b5cf6",
			"#000000",
			"#ffffff",
		]) {
			for (const bg of [LIGHT, DARK]) {
				expect(
					contrastRatio(ensureContrast(hex, bg), bg),
				).toBeGreaterThanOrEqual(4.5);
			}
		}
	});
});
