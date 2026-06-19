import { describe, expect, it } from "vitest";
import { rewriteFigureSrcs } from "./figure-refs";

describe("rewriteFigureSrcs", () => {
	const sha = "a".repeat(64);

	it("rewrites content-addressed figure refs to the proxy route", () => {
		const out = rewriteFigureSrcs(`<p><img src="figures/${sha}.png"> x</p>`);
		expect(out).toBe(`<p><img src="/api/version-diff/figures/${sha}"> x</p>`);
	});

	it("leaves non-figure srcs untouched", () => {
		const html = `<img src="https://example.com/a.png"><img src="figures/short.png">`;
		expect(rewriteFigureSrcs(html)).toBe(html);
	});
});
