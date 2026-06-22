import { describe, expect, it } from "vitest";
import { renderMathInHtml } from "./render-math";

describe("renderMathInHtml", () => {
	it("renders an inline math span to KaTeX markup", () => {
		const out = renderMathInHtml(
			`<p>x <span class="math inline">\\(x^2\\)</span> y</p>`,
		);
		expect(out).toContain('class="katex"');
		expect(out).not.toContain('class="math inline"');
		expect(out).toContain("<p>x ");
	});

	it("renders display math ($$) with displayMode", () => {
		const out = renderMathInHtml(`<span class="math display">$$a+b$$</span>`);
		expect(out).toContain("katex");
		expect(out).toContain('class="katex-display"');
	});

	it("decodes entities in the TeX body", () => {
		// a < b would arrive HTML-escaped from Pandoc
		const out = renderMathInHtml(
			`<span class="math inline">\\(a &lt; b\\)</span>`,
		);
		// Rendered (not the fallback): decode let KaTeX parse `<` as an operator
		// rather than erroring on a literal `&lt;`.
		expect(out).toContain("katex");
		expect(out).not.toContain('class="math inline"');
	});

	it("leaves non-math content untouched", () => {
		const html = `<p>no math here <del>old</del><ins>new</ins></p>`;
		expect(renderMathInHtml(html)).toBe(html);
	});

	it("falls back to clean plain text for a non-TeX span (no KaTeX red error)", () => {
		// An inline run mis-tagged as math whose body is actually HTML markup.
		const out = renderMathInHtml(
			`<p><span class="math inline">&nbsp;&lt;em&gt;ε̇&lt;/em&gt;</span> rate</p>`,
		);
		expect(out).not.toContain("katex-error"); // no red error box
		expect(out).not.toContain('class="math inline"'); // span consumed
		expect(out).not.toContain("&lt;em&gt;"); // tags stripped, not shown literally
		expect(out).toContain("ε̇"); // the bare symbol survives
	});
});
