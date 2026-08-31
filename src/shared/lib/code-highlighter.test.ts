import { describe, expect, it } from "vitest";
import { type CodeLang, getCodeHighlighter } from "./code-highlighter";
import { APP_CODE_THEME } from "./code-theme";

const SAMPLES: Record<CodeLang, string> = {
	html: '<div class="a">x</div>',
	markdown: "# h\n\n**b**\n",
	xml: '<mj-text font-size="14px">x</mj-text>',
};

describe("getCodeHighlighter", () => {
	it("tokenizes every registered language with the app theme", async () => {
		const highlighter = await getCodeHighlighter();

		for (const [lang, code] of Object.entries(SAMPLES)) {
			const html = highlighter.codeToHtml(code, {
				lang,
				theme: APP_CODE_THEME,
			});
			expect(
				html.match(/<span style="color:var\(--sx-/g)?.length,
			).toBeGreaterThan(1);
		}
	});
});
