import { describe, expect, it } from "vitest";
import {
	campaignAnnouncementBody,
	markdownToAnnouncementHtml,
} from "./sanitize";

describe("markdownToAnnouncementHtml", () => {
	it("keeps ordinary markdown formatting", () => {
		const html = markdownToAnnouncementHtml("**bold** and [a link](/fee)");
		expect(html).toContain("<strong>bold</strong>");
		expect(html).toContain('href="/fee"');
	});

	it("drops a script smuggled into the markdown", () => {
		const html = markdownToAnnouncementHtml("hi <script>alert(1)</script>");
		expect(html).not.toContain("script");
	});

	it("drops an image so it cannot phone home from the reader's browser", () => {
		const html = markdownToAnnouncementHtml("![x](https://tracker.test/p.gif)");
		expect(html).not.toContain("tracker.test");
	});
});

describe("campaignAnnouncementBody", () => {
	it("degrades an MJML campaign to plain text", () => {
		const body = campaignAnnouncementBody(
			"MJML",
			"<mjml/>",
			"<table><tr><td><p>Hello there</p></td></tr></table>",
		);
		expect(body).toContain("Hello there");
		expect(body).not.toContain("<table");
	});

	it("escapes a plain-text campaign instead of rendering it", () => {
		const body = campaignAnnouncementBody("PLAIN", "5 < 6 & <b>x</b>", "");
		expect(body).toContain("&lt;b&gt;");
		expect(body).not.toContain("<b>");
	});
});
