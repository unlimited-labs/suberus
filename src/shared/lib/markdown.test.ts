import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
	it("strips raw HTML", () => {
		const html = renderMarkdown(
			"<script>alert(1)</script>\n\nhi <img src=x onerror=alert(1)> <b onmouseover=alert(1)>b</b>",
		);

		expect(html).not.toMatch(/script|<img|onerror|onmouseover/i);
		expect(html).toContain("hi");
	});

	it.each([
		"[x](javascript:alert(1))",
		"[x](java&#115;cript:alert(1))",
		"[x](&#106;avascript:alert(1))",
		"<javascript:alert(1)>",
		"[x][r]\n\n[r]: javascript:alert(1)",
		"[x](data:text/html,<script>alert(1)</script>)",
	])("drops the link but keeps its text: %s", (source) => {
		const html = renderMarkdown(source);

		expect(html).not.toMatch(/<a\b|href=/);
		expect(html).toMatch(/x|javascript:alert/);
	});

	it("drops an image with an unsafe source", () => {
		expect(renderMarkdown("![i](javascript:alert(1))")).not.toMatch(/<img/);
	});

	it("keeps ordinary formatting, safe links and images", () => {
		const html = renderMarkdown(
			"**bold** [web](https://x.org/?a=1&b=2) [mail](mailto:a@b.c) [top](#s) [rel](/fee) <a@b.c> ![logo](https://x.org/l.png)",
		);

		expect(html).toContain("<strong>bold</strong>");
		expect(html).toContain('<a href="https://x.org/?a=1&amp;b=2">web</a>');
		expect(html).toContain('<a href="mailto:a@b.c">mail</a>');
		expect(html).toContain('<a href="#s">top</a>');
		expect(html).toContain('<a href="/fee">rel</a>');
		expect(html).toContain('<a href="mailto:a@b.c">a@b.c</a>');
		expect(html).toContain('<img src="https://x.org/l.png" alt="logo">');
	});
});
