import { parseFragment, serialize } from "parse5";
import { describe, expect, it } from "vitest";
import { diffHtml, redlineStats } from "./diff";

describe("diffHtml", () => {
	it("marks inserted and deleted words", () => {
		const out = diffHtml(
			"<p>The quick brown fox</p>",
			"<p>The slow brown fox jumps</p>",
		);
		expect(out).toMatch(/<del\b/);
		expect(out).toMatch(/<ins\b/);
		expect(out).toContain("brown fox");
	});

	it("returns balanced HTML on a heading-level change (parse5 fixed point)", () => {
		const out = diffHtml("<h2>Title</h2>", "<h3>Title</h3>");
		// idempotent through a second parse5 round-trip => balanced
		expect(serialize(parseFragment(out))).toBe(out);
	});

	it("treats a math span as one atomic unit (no garbled half-equation)", () => {
		const oldHtml = `<p>Energy <span class="math inline">E=mc^2</span> holds.</p>`;
		const newHtml = `<p>Energy <span class="math inline">E=mc^3</span> holds.</p>`;
		const out = diffHtml(oldHtml, newHtml);
		// The changed equation appears whole in both a del and an ins, never split.
		expect(out).toContain("E=mc^2");
		expect(out).toContain("E=mc^3");
		expect(out).not.toMatch(/xeqx[0-9a-f]+x/); // tokens fully restored
	});

	it("does not diff an unchanged identical equation", () => {
		const html = `<p>See <span class="math inline">a+b</span>.</p>`;
		const out = diffHtml(html, html);
		expect(out).not.toMatch(/<(ins|del)\b/);
		expect(out).toContain("a+b");
	});

	it("kills a vector smuggled into the new content (final sanitize, C2)", () => {
		const out = diffHtml(
			"<p>clean</p>",
			`<p>clean</p><p><img src=x onerror="alert(1)"> added</p>`,
		);
		expect(out.toLowerCase()).not.toContain("onerror");
	});
});

describe("redlineStats", () => {
	it("counts ins/del runs", () => {
		const redline = "<p><del>a</del><ins>b</ins> and <ins>c</ins></p>";
		expect(redlineStats(redline)).toEqual({ insertions: 2, deletions: 1 });
	});
});
