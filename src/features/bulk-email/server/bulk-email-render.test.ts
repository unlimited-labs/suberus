import { describe, expect, it } from "vitest";
import { renderEmailContent } from "./bulk-email-render";

describe("renderEmailContent", () => {
	it("passes PLAIN through untouched as text", async () => {
		const r = await renderEmailContent("PLAIN", "Hello {{firstName}}");
		expect(r).toEqual({ body: "Hello {{firstName}}", isHtml: false });
	});

	it("renders MARKDOWN to HTML, keeping placeholders intact", async () => {
		const r = await renderEmailContent("MARKDOWN", "# Hi {{firstName}}");
		expect(r.isHtml).toBe(true);
		expect(r.body).toContain("<h1>");
		expect(r.body).toContain("{{firstName}}");
	});

	it("compiles MJML to HTML, keeping placeholders intact", async () => {
		const r = await renderEmailContent(
			"MJML",
			"<mjml><mj-body><mj-section><mj-column><mj-text>Hi {{firstName}}</mj-text></mj-column></mj-section></mj-body></mjml>",
		);
		expect(r.isHtml).toBe(true);
		expect(r.body).toContain("<!doctype html>");
		expect(r.body).toContain("{{firstName}}");
	});
});
