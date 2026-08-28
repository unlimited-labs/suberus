import { describe, expect, it } from "vitest";
import { contentDisposition, contentDispositionAttachment } from "./file-names";

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

	it("percent-encodes what RFC 5987 attr-char forbids", () => {
		expect(contentDispositionAttachment("O'Brien (1)*!.pdf")).toContain(
			`filename*=UTF-8''O%27Brien%20%281%29%2A%21.pdf`,
		);
	});

	it("never emits an empty ext-value", () => {
		expect(contentDispositionAttachment("")).toContain(
			`attachment; filename="download"; filename*=UTF-8''download`,
		);
	});
});

describe("contentDisposition", () => {
	it("builds an inline disposition with the same safety", () => {
		expect(contentDisposition("inline", "概要.pdf")).toBe(
			`inline; filename="__.pdf"; filename*=UTF-8''${encodeURIComponent("概要.pdf")}`,
		);
	});
});
