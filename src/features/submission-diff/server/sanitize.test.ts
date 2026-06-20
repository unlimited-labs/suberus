import { describe, expect, it } from "vitest";
import { sanitizeDiffHtml } from "./sanitize";

describe("sanitizeDiffHtml", () => {
	const vectors: Array<{ name: string; html: string; forbidden: string[] }> = [
		{
			name: "img onerror",
			html: `<p>ok</p><img src=x onerror="alert(1)">`,
			forbidden: ["onerror", "alert("],
		},
		{
			name: "javascript: href",
			html: `<a href="javascript:alert(1)">x</a>`,
			forbidden: ["javascript:"],
		},
		{
			name: "svg+script",
			html: `<svg><script>alert(1)</script></svg><p>ok</p>`,
			forbidden: ["<script", "<svg"],
		},
		{
			name: "iframe",
			html: `<iframe src="https://evil.example"></iframe><p>ok</p>`,
			forbidden: ["<iframe"],
		},
		{
			name: "object/embed",
			html: `<object data="x"></object><embed src="y"><p>ok</p>`,
			forbidden: ["<object", "<embed"],
		},
		{
			name: "inline event handler",
			html: `<p onclick="steal()">hi</p>`,
			forbidden: ["onclick"],
		},
		{
			name: "style with js url",
			html: `<style>p{background:url("javascript:alert(1)")}</style><p>ok</p>`,
			forbidden: ["<style", "javascript:"],
		},
		{
			name: "data: html img",
			html: `<img src="data:text/html,<script>alert(1)</script>">`,
			forbidden: ["data:text/html", "<script"],
		},
		{
			name: "external tracking img (blind-review de-anon, C11)",
			html: `<p>ok</p><img src="https://tracker.example/p?sub=42">`,
			forbidden: ["https://tracker", "tracker.example"],
		},
		{
			name: "external anchor href (C11)",
			html: `<a href="https://tracker.example/x">link</a>`,
			forbidden: ["https://tracker", "tracker.example"],
		},
		{
			name: "form/input phishing",
			html: `<form action="https://evil"><input name="pw"></form><p>ok</p>`,
			forbidden: ["<form", "<input"],
		},
		{
			name: "mXSS nesting",
			html: `<div><p>1<math><mtext><table><mglyph><style><img src=x onerror=alert(1)></style>`,
			forbidden: ["onerror", "alert("],
		},
	];

	for (const v of vectors) {
		it(`removes vector: ${v.name}`, () => {
			const out = sanitizeDiffHtml(v.html).toLowerCase();
			for (const f of v.forbidden) {
				expect(out).not.toContain(f.toLowerCase());
			}
		});
	}

	it("preserves a benign redline (ins/del/strong)", () => {
		const out = sanitizeDiffHtml(
			`<p>Cooling at <del>45</del><ins>30</ins> <strong>C/s</strong>.</p>`,
		);
		expect(out).toContain("<ins>");
		expect(out).toContain("<del>");
		expect(out).toContain("<strong>");
	});

	it("keeps img width/height attrs (B2 figure sizing) but drops style", () => {
		const out = sanitizeDiffHtml(
			`<img src="figures/abc.png" width="320" height="200" style="width:99in">`,
		);
		expect(out).toContain("figures/abc.png");
		expect(out).toContain('width="320"');
		expect(out).not.toContain("style=");
	});

	it("kills a vector smuggled inside <ins> (C2: sanitize is the last gate)", () => {
		const out = sanitizeDiffHtml(
			`<p>clean</p><ins><img src=x onerror="alert(1)"> added</ins>`,
		);
		expect(out.toLowerCase()).not.toContain("onerror");
		expect(out).toContain("<ins>");
	});
});
