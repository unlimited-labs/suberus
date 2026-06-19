import { describe, expect, it } from "vitest";
import { diffHtml } from "./diff";
import { mapFigureSrcs } from "./figure-refs";

const mathSpan = (tex: string) =>
	`<p>Energy <span class="math inline">\\(${tex}\\)</span> holds.</p>`;

describe("diffHtml math", () => {
	it("tags a changed equation's wrapper .matheq so it renders boxed, not struck", () => {
		const redline = diffHtml(mathSpan("E=mc^2"), mathSpan("E=mc^3"));
		expect(redline).toMatch(/<del[^>]*class="matheq"/);
		expect(redline).toMatch(/<ins[^>]*class="matheq"/);
	});

	it("leaves an unchanged equation untagged (no spurious diff)", () => {
		const redline = diffHtml(mathSpan("E=mc^2"), mathSpan("E=mc^2"));
		expect(redline).not.toContain("matheq");
		expect(redline).not.toMatch(/<(del|ins)\b/);
	});
});

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
