import { describe, expect, it } from "vitest";
import { mapFigureSrcs } from "./figure-refs";

// The redline itself (structural tree diff, math protection, moves) is produced
// by the docx-api sidecar — see services/docx-api/test_diffhtml.py.

describe("mapFigureSrcs", () => {
	const sha = "a".repeat(64);

	it("rewrites content-addressed figure refs via the resolver", () => {
		const out = mapFigureSrcs(
			`<p><img src="figures/${sha}.png"> x</p>`,
			(s) => `data:image/png;base64,${s.slice(0, 4)}`,
		);
		expect(out).toBe(`<p><img src="data:image/png;base64,aaaa"> x</p>`);
	});

	it("leaves a figure ref untouched when the resolver returns undefined", () => {
		const html = `<img src="figures/${sha}.png">`;
		expect(mapFigureSrcs(html, () => undefined)).toBe(html);
	});

	it("leaves non-figure srcs untouched", () => {
		const html = `<img src="https://example.com/a.png"><img src="figures/short.png">`;
		expect(mapFigureSrcs(html, () => "data:x")).toBe(html);
	});
});
