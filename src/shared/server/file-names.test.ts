import { describe, expect, it } from "vitest";
import { contentDispositionAttachment } from "./file-names";

describe("contentDispositionAttachment", () => {
	it("keeps a plain ASCII name in the fallback", () => {
		expect(contentDispositionAttachment("Abstract.docx")).toBe(
			`attachment; filename="Abstract.docx"; filename*=UTF-8''Abstract.docx`,
		);
	});

	it("latinizes diacritics", () => {
		expect(contentDispositionAttachment("Zgłoszenie_Ząbek.docx")).toContain(
			`filename="Zgloszenie_Zabek.docx"`,
		);
	});

	it("emits a header-safe fallback for a non-Latin name", () => {
		const header = contentDispositionAttachment("ポーランド_概要.docx");
		expect(header).toMatch(/^[\x20-\x7E]*$/);
		expect(header).toContain(
			`filename*=UTF-8''${encodeURIComponent("ポーランド_概要.docx")}`,
		);
	});

	it("replaces every non-ASCII character in the fallback", () => {
		expect(contentDispositionAttachment("概要.docx")).toContain(
			`filename="__.docx"`,
		);
	});

	it("leaves no bare quote in the fallback", () => {
		expect(contentDispositionAttachment('we"ird.docx')).not.toContain('"we"');
	});
});
